const { SerialPort } = require('serialport');

const COMMANDS = {
  API_VERSION: 1,
  FC_VARIANT: 2,
  FC_VERSION: 3,
  BOARD_INFO: 4,
  BUILD_INFO: 5,
  NAME: 10,
  STATUS: 101,
  ANALOG: 110,
  STATUS_EX: 150,
  UID: 160
};

function encodeV1(command, payload = Buffer.alloc(0)) {
  const size = payload.length;
  const frame = Buffer.alloc(size + 6);
  frame.write('$M<', 0, 'ascii');
  frame[3] = size;
  frame[4] = command;
  payload.copy(frame, 5);
  let checksum = size ^ command;
  for (const byte of payload) checksum ^= byte;
  frame[frame.length - 1] = checksum;
  return frame;
}

class MSPConnection {
  constructor() {
    this.port = null;
    this.buffer = Buffer.alloc(0);
    this.pending = new Map();
  }

  async list() {
    return (await SerialPort.list()).map(port => ({
      path: port.path,
      manufacturer: port.manufacturer || '未知设备',
      serialNumber: port.serialNumber || '',
      vendorId: port.vendorId || '',
      productId: port.productId || ''
    }));
  }

  async connect(path) {
    await this.disconnect();
    this.port = new SerialPort({ path, baudRate: 115200, autoOpen: false });
    await new Promise((resolve, reject) => this.port.open(error => error ? reject(error) : resolve()));
    this.port.on('data', data => this.onData(data));
    this.port.on('close', () => this.rejectAll(new Error('飞控连接已断开')));
    const identity = await this.readIdentity();
    if (identity.variant !== 'BTFL') throw new Error(`检测到 ${identity.variant || '未知'} 固件，当前版本仅支持 Betaflight`);
    return identity;
  }

  async disconnect() {
    if (!this.port) return;
    const port = this.port;
    this.port = null;
    this.rejectAll(new Error('连接已关闭'));
    if (port.isOpen) await new Promise(resolve => port.close(() => resolve()));
  }

  rejectAll(error) {
    for (const entry of this.pending.values()) entry.reject(error);
    this.pending.clear();
  }

  request(command, timeout = 1800) {
    if (!this.port?.isOpen) return Promise.reject(new Error('请先连接飞控'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(command); reject(new Error(`MSP ${command} 响应超时`)); }, timeout);
      this.pending.set(command, { resolve: data => { clearTimeout(timer); resolve(data); }, reject: error => { clearTimeout(timer); reject(error); } });
      this.port.write(encodeV1(command), error => { if (error) { clearTimeout(timer); this.pending.delete(command); reject(error); } });
    });
  }

  onData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    while (this.buffer.length >= 6) {
      const start = this.buffer.indexOf(Buffer.from('$M'));
      if (start < 0) { this.buffer = Buffer.alloc(0); return; }
      if (start > 0) this.buffer = this.buffer.subarray(start);
      if (this.buffer.length < 6) return;
      const size = this.buffer[3];
      const total = size + 6;
      if (this.buffer.length < total) return;
      const frame = this.buffer.subarray(0, total);
      this.buffer = this.buffer.subarray(total);
      const command = frame[4];
      let checksum = size ^ command;
      for (let i = 5; i < total - 1; i++) checksum ^= frame[i];
      if (checksum !== frame[total - 1]) continue;
      const pending = this.pending.get(command);
      if (pending) { this.pending.delete(command); pending.resolve(frame.subarray(5, total - 1)); }
    }
  }

  async readIdentity() {
    const [api, variant, version, board, name] = await Promise.all([
      this.request(COMMANDS.API_VERSION), this.request(COMMANDS.FC_VARIANT),
      this.request(COMMANDS.FC_VERSION), this.request(COMMANDS.BOARD_INFO),
      this.request(COMMANDS.NAME).catch(() => Buffer.alloc(0))
    ]);
    return {
      api: `${api[1] || 0}.${api[2] || 0}`,
      variant: variant.toString('ascii'),
      firmware: `${version[0] || 0}.${version[1] || 0}.${version[2] || 0}`,
      boardIdentifier: board.subarray(0, 4).toString('ascii'),
      boardVersion: board.length >= 6 ? board.readUInt16LE(4) : 0,
      craftName: name.toString('utf8').replace(/\0/g, '') || '未命名穿越机'
    };
  }

  async selfTest() {
    const startedAt = Date.now();
    const identity = await this.readIdentity();
    const results = [];
    const add = (id, label, level, detail) => results.push({ id, label, level, detail });
    add('firmware', '飞控与固件', identity.variant === 'BTFL' ? 'good' : 'bad', `${identity.boardIdentifier} · Betaflight ${identity.firmware}`);
    add('api', 'MSP API兼容性', /^1\.(4[4-9]|[5-9]\d)$/.test(identity.api) ? 'good' : 'warn', `API ${identity.api}`);
    try {
      const status = await this.request(COMMANDS.STATUS_EX);
      const cycleTime = status.length >= 2 ? status.readUInt16LE(0) : 0;
      const cpuLoad = status.length >= 14 ? status.readUInt16LE(12) : 0;
      add('status', '飞控运行状态', cycleTime > 0 ? 'good' : 'warn', `循环周期 ${cycleTime} μs · CPU ${cpuLoad / 10}%`);
    } catch (error) { add('status', '飞控运行状态', 'warn', error.message); }
    try {
      const analog = await this.request(COMMANDS.ANALOG);
      const voltage = analog.length ? analog[0] / 10 : 0;
      add('power', '供电与电池', voltage > 0 ? 'good' : 'warn', voltage > 0 ? `${voltage.toFixed(1)} V` : '仅USB供电或未检测到主电池');
    } catch (error) { add('power', '供电与电池', 'warn', error.message); }
    add('link', '通信稳定性', 'good', `完成 ${Date.now() - startedAt} ms · 校验通过`);
    return { identity, results, checkedAt: new Date().toISOString() };
  }
}

module.exports = { MSPConnection };

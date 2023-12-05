'use strict';

const Homey = require('homey');

// Byte 5
// Bit:     |7  6  5  4  3  2  1  0|
// Field:   |  |  |  |  |  |Mode
//          |  |  |  |  |Power
//          |  |  |  |Unused
//          |  |  |Clean
//          |  |Filter
//          |Unused
const MHI_MODE_BITS = 0b00000111;
const MHI_ONOFF_BITS = 0b00001000;
const MHI_CLEAN_BITS = 0b00100000;
const MHI_FILTER_BITS = 0b01000000;

const MHI_MODE_AUTO = 0b000;
const MHI_MODE_COOL = 0b001;
const MHI_MODE_DRY = 0b010;
const MHI_MODE_FAN = 0b011;
const MHI_MODE_HEAT = 0b100;

// Byte 7 - Temperature(4bit) Unused(4bit)
// Bit:     |7  6  5  4  3  2  1  0|
// Field:   |  |  |  |  |Temperature
//          |  |  |  |Unused
//          |  |  |Unused
//          |  |Unused
//          |Unused
const MHI_TEMPERATURE_BITS = 0b00001111;
const MHI_TEMP_MIN = 17;
const MHI_TEMP_MAX = 30;
const MHI_TEMP_DEFAULT = 22;

// Byte 9
// Bit:     |7  6  5  4  3  2  1  0|
// Field:   |  |  |  |  |Fan
//          |  |  |  |Unused
//          |  |  |Unused
//          |  |Unused
//          |Unused
const MHI_FAN_BITS = 0b00001111;
const MHI_FAN_AUTO = 0b00000000;
const MHI_FAN_LOW = 0b00000001;
const MHI_FAN_MEDIUM = 0b00000010;
const MHI_FAN_HIGH = 0b00000011;
const MHI_FAN_MAX = 0b00000100;

// Byte 11
// Bit:     |7  6  5  4  3  2  1  0|
// Field:   |  |  |  |  |  |  |  |Unused
//          |  |  |  |  |  |  |Three
//          |  |  |  |  |  |Unused
//          |  |  |  |  |Unused
//          |  |  |  |D
//          |SwingV
const MHI_THREE_BITS = 0b00000010;  // Set together with D_BITS
const MHI_D_BITS = 0b00010000;      // Set together with THREE_BITS
const MHI_SWINGV_BITS = 0b11100000;
const MHI_SWINGV_AUTO = 0b00000000;
const MHI_SWINGV_HIGHEST = 0b00100000;
const MHI_SWINGV_HIGH = 0b01000000;
const MHI_SWINGV_MIDDLE = 0b01100000;
const MHI_SWINGV_LOW = 0b10000000;
const MHI_SWINGV_LOWEST = 0b10100000;
const MHI_SWINGV_OFF = 0b11000000;

// Byte 13
// Bit:     |7  6  5  4  3  2  1  0|
// Field:   |  |  |  |  |SwingH
//          |  |  |  |Unused
//          |  |  |Unused
//          |  |Unused
//          |Unused
const MHI_SWINGH_BITS = 0b00001111;
const MHI_SWINGH_AUTO = 0b00000000;
const MHI_SWINGH_LEFTMAX = 0b00000001;
const MHI_SWINGH_LEFT = 0b00000010;
const MHI_SWINGH_MIDDLE = 0b00000011;
const MHI_SWINGH_RIGHT = 0b00000100;
const MHI_SWINGH_RIGHTMAX = 0b00000101;
const MHI_SWINGH_RIGHTLEFT = 0b00000110;
const MHI_SWINGH_LEFTRIGHT = 0b00000111;
const MHI_SWINGH_OFF = 0b00001000;

// Byte 15
// Bit:     |7  6  5  4  3  2  1  0|
// Field:   |  |  |  |  |  |  |  |Unused
//          |  |  |  |  |  |  |Unused
//          |  |  |  |  |  |Unused
//          |  |  |  |  |Unused
//          |  |  |  |Unused
//          |  |  |Unused
//          |  |Night
//          |Silent

const MHI_NIGHT_BITS = 0b01000000;
const MHI_SILENT_BITS = 0b10000000;

module.exports = class SplitAircoDevice extends Homey.Device {

  async onInit() {
    this.registerMultipleCapabilityListener(this.getCapabilities(), this.onCapabilitiesChanged.bind(this), 1000);
  }

  async onCapabilitiesChanged(valuesObj) {
    await this.setState({
      on: valuesObj.onoff ?? this.getCapabilityValue('onoff') ?? false,
      temperature: valuesObj.target_temperature ?? this.getCapabilityValue('target_temperature') ?? MHI_TEMP_DEFAULT,
      mode: valuesObj.operation_mode ?? this.getCapabilityValue('operation_mode') ?? 'auto',
      fanMode: valuesObj.fan_mode ?? this.getCapabilityValue('fan_mode') ?? 'medium',
      swingVMode: valuesObj.swingv_mode ?? this.getCapabilityValue('swingv_mode') ?? 'middle',
      swingHMode: valuesObj.swingh_mode ?? this.getCapabilityValue('swingh_mode') ?? 'middle',
    });
  }

  async setState({
    on = true,
    temperature = MHI_TEMP_DEFAULT,
    mode = 'auto',
    fanMode = 'medium',
    swingVMode = 'middle',
    swingHMode = 'middle',
  } = {}) {
    // console.log(`setState ${on} ${temperature} ${mode} ${fanMode} ${swingVMode} ${swingHMode}`)
    const payload = [
      0xAD, // Byte 0 — Sig[0]
      0x51, // Byte 1 — Sig[1]
      0x3C, // Byte 2 — Sig[2]
      0xE5, // Byte 3 — Sig[3]
      0x1A, // Byte 4 — Sig[4]
      0x00, // Byte 5 — Filter(1bit) Clean(1bit) Unused(2bit) Power(1bit) Mode(3bit)
      0x00, // Byte 6 — Unused
      0x00, // Byte 7 - Unused(4bit) Temperature(4bit)
      0x00, // Byte 8 — Unused
      0x00, // Byte 9 — Unused(4bit) Fan(4bit)
      0x00, // Byte 10 — Unused
      0x00, // Byte 11 — SwingV(3bit) D(1bit) Unused(2bit) Three(1bit) Unused(1bit)
      0x00, // Byte 12 — Unused
      0x00, // Byte 13 — Unused(4bit) SwingH(4bit)
      0x00, // Byte 14 — Unused
      0x00, // Byte 15 — Silent(1bit) Night(1bit) Unused(6bit)
      0x00, // Byte 16 — Unused
      0x80, // Byte 17
      0x00, // Byte 18
    ];

    // Set bit 5 in Byte 5 to turn on/off
    if (on) {
      payload[5] |= MHI_ONOFF_BITS;
    } else {
      payload[5] &= ~MHI_ONOFF_BITS;
    }

    // Set Mode
    let modeBits;
    switch (mode) {
      case 'dry': {
        modeBits = MHI_MODE_DRY;
        break;
      }
      case 'cool': {
        modeBits = MHI_MODE_COOL;
        break;
      }
      case 'heat': {
        modeBits = MHI_MODE_HEAT;
        break;
      }
      case 'auto': {
        modeBits = MHI_MODE_AUTO;
        break;
      }
      case 'fan': {
        modeBits = MHI_MODE_FAN;
        break;
      }
      default: {
        throw new Error(`Invalid Mode: ${mode}`);
      }
    }
    payload[5] &= ~MHI_MODE_BITS;
    payload[5] |= modeBits;

    // Set Temperature
    payload[7] = Math.round(Math.min(Math.max(temperature, MHI_TEMP_MIN), MHI_TEMP_MAX) - MHI_TEMP_MIN);

    // Fan speed
    switch (fanMode) {
      case 'auto': {
        modeBits = MHI_FAN_AUTO;
        break;
      }
      case 'low': {
        modeBits = MHI_FAN_LOW;
        break;
      }
      case 'medium': {
        modeBits = MHI_FAN_MEDIUM;
        break;
      }
      case 'high': {
        modeBits = MHI_FAN_HIGH;
        break;
      }
      case 'max': {
        modeBits = MHI_FAN_MAX;
        break;
      }
      default: {
        throw new Error(`Invalid Fan Mode: ${fanMode}`);
      }
    }
    payload[9] &= ~MHI_FAN_BITS;
    payload[9] |= modeBits;

    // Set vertical swing
    switch (swingVMode) {
      case 'auto': {
        modeBits = MHI_SWINGV_AUTO;
        break;
      }
      case 'highest': {
        modeBits = MHI_SWINGV_HIGHEST;
        break;
      }
      case 'high': {
        modeBits = MHI_SWINGV_HIGH;
        break;
      }
      case 'middle': {
        modeBits = MHI_SWINGV_MIDDLE;
        break;
      }
      case 'low': {
        modeBits = MHI_SWINGV_LOW;
        break;
      }
      case 'lowest': {
        modeBits = MHI_SWINGV_LOWEST;
        break;
      }
      case 'off': {
        modeBits = MHI_SWINGV_OFF;
        break;
      }
      default: {
        throw new Error(`Invalid SwingV Mode: ${swingVMode}`);
      }
    }
    payload[11] &= ~MHI_SWINGV_BITS;
    payload[11] |= modeBits;

    // Set horizontal swing
    switch (swingHMode) {
      case 'auto': {
        modeBits = MHI_SWINGH_AUTO;
        break;
      }
      case 'leftmax': {
        modeBits = MHI_SWINGH_LEFTMAX;
        break;
      }
      case 'left': {
        modeBits = MHI_SWINGH_LEFT;
        break;
      }
      case 'middle': {
        modeBits = MHI_SWINGH_MIDDLE;
        break;
      }
      case 'right': {
        modeBits = MHI_SWINGH_RIGHT;
        break;
      }
      case 'rightmax': {
        modeBits = MHI_SWINGH_RIGHTMAX;
        break;
      }
      case 'rightleft': {
        modeBits = MHI_SWINGH_RIGHTLEFT;
        break;
      }
      case 'leftright': {
        modeBits = MHI_SWINGH_LEFTRIGHT;
        break;
      }
      case 'off': {
        modeBits = MHI_SWINGH_OFF;
        break;
      }
      default: {
        throw new Error(`Invalid SwingH Mode: ${swingHMode}`);
      }
    }
    payload[13] &= ~MHI_SWINGH_BITS;
    payload[13] |= modeBits;

    // No checksum but inverted bytepairs
    for (let i = 5; i < payload.length; i += 2) {
      payload[i + 1] = ~payload[i] & 0xFF;
    }

    // this.log('Payload:', Buffer.from(payload).toString('hex'));

    // Convert payload to array of 1 and 0
    const payloadBinary = [];
    for (const i of payload) {
      for (let j = 0; j < 8; j++) {
        const bit = i & (1 << j);
        payloadBinary.push(bit ? 1 : 0);
      }
    }

    // Transmit the payload
    this.signal = await this.homey.rf.getSignalInfrared('mitsubishi');
    this.signal.tx(payloadBinary, {
      device: this,
    })
      // .then(() => this.log('TX Complete'))
      .catch((err) => this.error('TX Error:', err));
  }

};

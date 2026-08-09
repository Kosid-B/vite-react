import { describe, it, expect } from 'vitest';
import { validCoord, roundCoord, parseGeo, mapsLink } from '../geo';

describe('validCoord', () => {
  it('พิกัดในช่วงถูกต้อง → true', () => {
    expect(validCoord(13.736, 100.523)).toBe(true);
    expect(validCoord(-33.8, 151.2)).toBe(true);
  });
  it('นอกช่วง / ไม่ใช่ตัวเลข / (0,0) → false', () => {
    expect(validCoord(91, 100)).toBe(false);
    expect(validCoord(13, 181)).toBe(false);
    expect(validCoord('x', 100)).toBe(false);
    expect(validCoord(NaN, 1)).toBe(false);
    expect(validCoord(0, 0)).toBe(false);        // null island = ยังไม่ปักหมุด
    expect(validCoord(undefined, undefined)).toBe(false);
  });
});

describe('roundCoord', () => {
  it('ปัดเหลือ ~6 ตำแหน่ง', () => {
    expect(roundCoord(13.73659123)).toBe(13.736591);
    expect(roundCoord(100.5)).toBe(100.5);
  });
});

describe('parseGeo', () => {
  it('ลิงก์ Google Maps แบบ @lat,lng', () => {
    expect(parseGeo('https://www.google.com/maps/@13.7563,100.5018,17z')).toEqual({ lat: 13.7563, lng: 100.5018 });
  });
  it('ลิงก์ place แบบ !3d!4d ชนะ @ (หมุดจริง ไม่ใช่จุดกึ่งกลาง)', () => {
    const url = 'https://www.google.com/maps/place/x/@13.70,100.50,17z/data=!3d13.7563!4d100.5018';
    expect(parseGeo(url)).toEqual({ lat: 13.7563, lng: 100.5018 });
  });
  it('ลิงก์ ?q=lat,lng', () => {
    expect(parseGeo('https://maps.google.com/?q=13.7563,100.5018')).toEqual({ lat: 13.7563, lng: 100.5018 });
  });
  it('"lat, lng" ล้วน (มีช่องว่าง)', () => {
    expect(parseGeo('13.7563, 100.5018')).toEqual({ lat: 13.7563, lng: 100.5018 });
  });
  it('อินพุตว่าง/ไม่มีพิกัด/พิกัดพัง → null', () => {
    expect(parseGeo('')).toBeNull();
    expect(parseGeo('ร้านกาแฟดี')).toBeNull();
    expect(parseGeo('https://maps.google.com/?q=999,999')).toBeNull(); // นอกช่วง
  });
});

describe('mapsLink', () => {
  it('สร้างลิงก์ Google Maps ไปพิกัด', () => {
    expect(mapsLink(13.7563, 100.5018)).toBe('https://www.google.com/maps?q=13.7563,100.5018');
  });
});

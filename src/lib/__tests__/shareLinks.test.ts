import { describe, it, expect } from 'vitest';
import { lineShareUrl, facebookShareUrl, shareText } from '../shareLinks';

const url = 'https://ceoaithailand.org/b/my-shop';

describe('shareLinks', () => {
  it('lineShareUrl encode url ถูก', () => {
    const s = lineShareUrl(url);
    expect(s.startsWith('https://social-plugins.line.me/lineit/share?url=')).toBe(true);
    expect(s).toContain(encodeURIComponent(url));
  });
  it('facebookShareUrl encode url ถูก', () => {
    expect(facebookShareUrl(url)).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  });
  it('shareText มีชื่อร้าน + ลิงก์', () => {
    expect(shareText('ร้านก๋วยเตี๋ยวไก่', url)).toContain('ร้านก๋วยเตี๋ยวไก่');
    expect(shareText('', url)).toContain('ร้านของเรา');
    expect(shareText('x', url)).toContain(url);
  });
});

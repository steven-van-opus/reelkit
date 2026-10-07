// 'stat' in both looks: the original cut-paper version (default) and the
// site-style studio version (REELS_THEME=studio). Props are the union of both.
import { isStudio } from '../brand.mjs';
import paper from './paper/stat.mjs';
import studio from './studio/stat.mjs';

export default {
  type: 'stat',
  describe: studio.describe || paper.describe,
  props: { ...paper.props, ...studio.props },
  draw(s) {
    return (isStudio() ? studio : paper).draw(s);
  },
};

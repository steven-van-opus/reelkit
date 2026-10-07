// 'steps' in both looks: the original cut-paper version (default) and the
// site-style studio version (REELS_THEME=studio). Props are the union of both.
import { isStudio } from '../brand.mjs';
import paper from './paper/steps.mjs';
import studio from './studio/steps.mjs';

export default {
  type: 'steps',
  describe: studio.describe || paper.describe,
  props: { ...paper.props, ...studio.props },
  draw(s) {
    return (isStudio() ? studio : paper).draw(s);
  },
};

import DefaultTheme from 'vitepress/theme';
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client';
import '@shikijs/vitepress-twoslash/style.css';
import './custom.css';
import type { EnhanceAppContext } from 'vitepress';
import BlacSandpack from './components/BlacSandpack.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue);
    app.component('BlacSandpack', BlacSandpack);
  },
};

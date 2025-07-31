import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import NotFound from './NotFound.vue';
import './custom.css';
import './custom-home.css';
import './style.css';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // You can add custom slots here if needed
    });
  },
  NotFound,
  enhanceApp({ app }) {
    // You can register global components here if needed
  },
};

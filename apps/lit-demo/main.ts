import './src/styles.css';
import { mount, html } from '@blac/lit';
import { App } from './src/app';
import { Hud } from './src/dev/hud.ui';

const root = document.getElementById('app');
if (!root) throw new Error('missing #app');
mount(html`${App()}${Hud()}`, root);

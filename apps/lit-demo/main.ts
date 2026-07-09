import './src/styles.css';
import { mount } from '@blac/lit';
import { App } from './src/app';

const root = document.getElementById('app');
if (!root) throw new Error('missing #app');
mount(App(), root);

import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

createApp(App).use(createPinia()).mount('#app');

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createVuetify } from 'vuetify';
import { ru } from 'vuetify/locale';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

import App from './App.vue';
import './styles/app.sass';

const vuetify = createVuetify({
  locale: {
    locale: 'ru',
    messages: { ru },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          success: '#4CAF50',
          error: '#FF5252',
          warning: '#FB8C00',
        },
      },
    },
  },
  defaults: {
    VDatePicker: {
      firstDayOfWeek: 1,
    },
  },
});

createApp(App).use(createPinia()).use(vuetify).mount('#app');

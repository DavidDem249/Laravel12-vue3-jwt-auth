// import './bootstrap';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
app.use(createPinia());
app.use(router);

const auth = useAuthStore();
// 🔥 IMPORTANT : attendre fetchUser AVANT mount
auth.fetchUser().finally(() => {
  app.mount('#app');
});

// app.mount('#app');

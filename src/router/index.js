import { createRouter, createWebHashHistory } from 'vue-router'
import LauncherView from '../views/LauncherView.vue'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: LauncherView },
    { path: '/selector', name: 'selector', component: HomeView },
  ],
})

export default router

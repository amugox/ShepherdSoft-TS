import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { globalAuthGuard } from './guards';

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { requiresAuth: false },
    children: [
      {
        path: 'login',
        name: 'login',
        meta: { requiresAuth: false, publicOnly: true },
        component: () => import('@/views/auth/LoginView.vue'),
      },
      {
        path: 'changepass',
        name: 'change-pass',
        // Inherits requiresAuth from parent, but ChangePass needs auth — override.
        meta: { requiresAuth: true },
        component: () => import('@/views/auth/ChangePassView.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
      { path: 'profile', name: 'profile', component: () => import('@/views/profile/ProfileView.vue') },
      {
        path: 'guest',
        children: [
          { path: '', name: 'guests', component: () => import('@/views/guest/GuestListView.vue') },
          { path: 'register', name: 'guest-register', component: () => import('@/views/guest/GuestRegisterView.vue') },
          { path: 'followups', name: 'guest-followups', component: () => import('@/views/guest/FollowUpsView.vue') },
          { path: ':code', name: 'guest-detail', component: () => import('@/views/guest/GuestDetailView.vue'), props: true },
        ],
      },
      {
        path: 'membership',
        children: [
          { path: '', name: 'members', component: () => import('@/views/membership/MembersView.vue') },
          { path: 'member/:code', name: 'member-detail', component: () => import('@/views/membership/MemberDetailView.vue'), props: true },
          { path: 'groups', name: 'member-groups', component: () => import('@/views/membership/DeptsView.vue') },
          { path: 'depts', redirect: '/membership/groups' },
          { path: 'flsps', name: 'fellowships', component: () => import('@/views/membership/FellowshipsView.vue') },
          { path: 'fams', name: 'fams', component: () => import('@/views/membership/FamiliesView.vue') },
        ],
      },
      { path: 'messaging', name: 'messaging', component: () => import('@/views/messaging/MessagingView.vue') },
      { path: 'settings/security', redirect: '/admin/security' },
      { path: 'settings/users', redirect: '/admin/users' },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/users' },
      {
        path: 'admins',
        name: 'admin-admins',
        meta: { requiresAdmin: true },
        component: () => import('@/views/admin/AdminUsersView.vue'),
      },
      {
        path: 'users',
        name: 'admin-users',
        meta: { requiresAdmin: true },
        component: () => import('@/views/admin/BranchUsersView.vue'),
      },
      {
        path: 'branches',
        name: 'admin-branches',
        meta: { requiresAdmin: true, requiresSuperAdmin: true },
        component: () => import('@/views/admin/BranchesView.vue'),
      },
      {
        path: 'security',
        name: 'admin-security',
        meta: { requiresAdmin: true },
        component: () => import('@/views/settings/SecurityView.vue'),
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(globalAuthGuard);

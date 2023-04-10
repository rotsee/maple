// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  css: ['vuetify/lib/styles/main.sass'],
  build: {
    transpile: ['vuetify'],
  },
  modules: [
    '@nuxt/content',
  ],
  app: {
    head: {
      script: [
        { src: '/svg-pan-zoom.min.js' },
      ],
    },
  },
  vite: {
    define: {
      'process.env.DEBUG': false,
    },
  },
})
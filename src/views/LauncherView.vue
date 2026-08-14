<script setup>
import { RouterLink } from 'vue-router'

const tools = [
  { id: 'selector', name: 'Selector', description: 'ゴグアーティア厳選の候補と履歴を管理するツール', route: '/selector', available: true },
  { id: 'future-tool', name: 'Future Tool', description: '新しいツールを準備中です', route: null, available: false },
]
</script>
<template><main class="launcher"><header class="launcher-header"><p class="eyebrow">PERSONAL TOOL COLLECTION</p><h1>Tool Box</h1><p>自作ツールをまとめて管理するランチャー</p></header><section class="tool-section"><h2>ツール一覧</h2><div class="tool-grid"><article v-for="tool in tools" :key="tool.id" class="tool-card" :class="{ unavailable: !tool.available }"><div><span class="tool-status">{{ tool.available ? 'AVAILABLE' : 'COMING SOON' }}</span><h3>{{ tool.name }}</h3><p>{{ tool.description }}</p></div><RouterLink v-if="tool.available" class="tool-open" :to="tool.route">開く <span>→</span></RouterLink><span v-else class="tool-disabled">準備中</span></article></div></section></main></template>
<style scoped>
.launcher{min-height:100dvh;padding:72px 8vw;color:#f1f5f8;background:#101419}.launcher-header{max-width:760px;margin-bottom:64px}.eyebrow,.tool-status{color:#d9a43b;font-size:11px;letter-spacing:.16em}.launcher h1{margin:10px 0;font-size:clamp(42px,6vw,72px);letter-spacing:-.04em}.launcher-header>p:last-child{color:#b5c1cb;font-size:18px}.tool-section h2{margin-bottom:18px;font-size:20px}.tool-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,360px));gap:18px}.tool-card{min-height:220px;padding:24px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid #506171;border-radius:10px;background:#1b242b;box-shadow:0 14px 30px rgba(0,0,0,.18)}.tool-card:hover{border-color:#d9a43b;transform:translateY(-2px)}.tool-card.unavailable{opacity:.62}.tool-card h3{margin:18px 0 10px;font-size:26px}.tool-card p{margin:0;color:#c4d0d9;line-height:1.7}.tool-open,.tool-disabled{align-self:flex-end;margin-top:24px;padding:10px 15px;border-radius:5px;font-weight:700;text-decoration:none}.tool-open{background:#d9a43b;color:#19150d}.tool-open span{margin-left:12px}.tool-disabled{color:#aebbc5;background:#2a343c}
</style>

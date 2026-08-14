<script setup>
import { computed, ref, toRaw, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { groupSkills, seriesSkills } from '../data/skills'

const STORAGE_KEY = 'gog-artia-data-v1'

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createTarget(name = '新しい厳選対象') {
  return {
    id: createId(),
    name,
    goal: { seriesId: null, groupId: null },
    history: [],
  }
}

function createInitialData() {
  const target = createTarget('新しい厳選対象')
  return { selectedTargetId: target.id, targets: [target] }
}

function loadData() {
  try {
    const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (savedData?.targets?.length) {
      return savedData
    }
  } catch {
    // 壊れた保存データは初期データとして扱う
  }

  return createInitialData()
}

const persistentData = ref(loadData())
const undoSnapshot = ref(null)
const selectedSeriesId = ref(null)
const selectedGroupId = ref(null)
const selectedHistoryIndex = ref(null)
const message = ref('')
const importFileInput = ref(null)

const currentTarget = computed(() => {
  return persistentData.value.targets.find(
    (target) => target.id === persistentData.value.selectedTargetId,
  ) || persistentData.value.targets[0]
})

const isSkillPairSelected = computed(() => {
  return Boolean(selectedSeriesId.value && selectedGroupId.value)
})

const currentGoalText = computed(() => {
  if (!currentTarget.value.goal.seriesId || !currentTarget.value.goal.groupId) {
    return '未設定'
  }

  return `${getSkillName(seriesSkills, currentTarget.value.goal.seriesId)} ＋ ${getSkillName(groupSkills, currentTarget.value.goal.groupId)}`
})

watch(
  persistentData,
  (newData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
  },
  { deep: true },
)

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentData.value))
}

function exportData() {
  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: structuredClone(toRaw(persistentData.value)),
  }
  const fileContents = JSON.stringify(exportPayload, null, 2)
  const file = new Blob([fileContents], { type: 'application/json' })
  const downloadUrl = URL.createObjectURL(file)
  const link = document.createElement('a')

  link.href = downloadUrl
  link.download = `gog-artia-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(downloadUrl)
}

function openImportDialog() {
  importFileInput.value?.click()
}

function validateImportedData(importPayload) {
  if (importPayload?.version !== 1) {
    throw new Error('対応していないデータ形式です。')
  }

  const importedData = importPayload.data
  if (!importedData || !Array.isArray(importedData.targets) || importedData.targets.length === 0) {
    throw new Error('対象データが見つかりません。')
  }

  for (const target of importedData.targets) {
    if (!target.id || typeof target.name !== 'string' || !target.goal || !Array.isArray(target.history)) {
      throw new Error('厳選対象データの形式が不正です。')
    }

    for (const history of target.history) {
      if (!history.seriesId || !history.groupId) {
        throw new Error('履歴データの形式が不正です。')
      }
    }
  }

  if (importedData.selectedTargetId && !importedData.targets.some((target) => target.id === importedData.selectedTargetId)) {
    throw new Error('選択中対象の整合性が取れません。')
  }

  return structuredClone(importedData)
}

function importData(event) {
  const file = event.target.files?.[0]
  event.target.value = ''

  if (!file) {
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const importedPayload = JSON.parse(reader.result)
      const importedData = validateImportedData(importedPayload)

      if (!window.confirm('現在の全Selectorデータをインポート内容で上書きしますか？')) {
        return
      }

      persistentData.value = importedData
      undoSnapshot.value = null
      selectedHistoryIndex.value = null
      clearSkillSelection()
      saveData()
      message.value = 'インポートしました。'
    } catch (error) {
      message.value = `インポートに失敗しました: ${error.message}`
    }
  }
  reader.readAsText(file)
}

function createUndoSnapshot() {
  undoSnapshot.value = structuredClone(toRaw(persistentData.value))
}

function commitDataChange(change) {
  createUndoSnapshot()
  change()
  saveData()
  clearSkillSelection()
}

function clearSkillSelection() {
  selectedSeriesId.value = null
  selectedGroupId.value = null
}

function selectSeriesSkill(id) {
  selectedSeriesId.value = selectedSeriesId.value === id ? null : id
}

function selectGroupSkill(id) {
  selectedGroupId.value = selectedGroupId.value === id ? null : id
}

function selectTarget(id) {
  persistentData.value.selectedTargetId = id
  selectedHistoryIndex.value = null
  clearSkillSelection()
}

function addTarget() {
  const newTarget = createTarget()

  commitDataChange(() => {
    persistentData.value.targets.push(newTarget)
    persistentData.value.selectedTargetId = newTarget.id
  })
}

function renameTarget() {
  const enteredName = window.prompt('対象名', currentTarget.value.name)

  if (enteredName === null) {
    return
  }

  const trimmedName = enteredName.trim()
  if (!trimmedName) {
    return
  }

  commitDataChange(() => {
    currentTarget.value.name = trimmedName
  })
}

function removeTarget() {
  if (persistentData.value.targets.length === 1) {
    message.value = '対象は1件以上必要です。'
    return
  }

  if (!window.confirm(`「${currentTarget.value.name}」を削除しますか？`)) {
    return
  }

  commitDataChange(() => {
    persistentData.value.targets = persistentData.value.targets.filter(
      (target) => target.id !== currentTarget.value.id,
    )
    persistentData.value.selectedTargetId = persistentData.value.targets[0].id
  })
}

function recordHistory() {
  if (!isSkillPairSelected.value) {
    return
  }

  commitDataChange(() => {
    currentTarget.value.history.push({
      seriesId: selectedSeriesId.value,
      groupId: selectedGroupId.value,
    })
  })
}

function setCurrentGoal() {
  if (!isSkillPairSelected.value) {
    return
  }

  commitDataChange(() => {
    currentTarget.value.goal = {
      seriesId: selectedSeriesId.value,
      groupId: selectedGroupId.value,
    }
  })
}

function restoreUndo() {
  if (!undoSnapshot.value) {
    return
  }

  const currentData = structuredClone(toRaw(persistentData.value))
  persistentData.value = structuredClone(toRaw(undoSnapshot.value))
  undoSnapshot.value = currentData
  saveData()
}

function selectHistory(index) {
  if (selectedHistoryIndex.value === index) {
    selectedHistoryIndex.value = null
    return
  }

  selectedHistoryIndex.value = index
}

function consumeSelectedHistory() {
  if (selectedHistoryIndex.value === null) {
    return
  }

  const consumeThrough = selectedHistoryIndex.value + 1

  const shouldConsume = window.confirm(
    `全厳選対象の履歴を#${String(selectedHistoryIndex.value + 1).padStart(2, '0')}まで消化しますか？`,
  )

  if (!shouldConsume) {
    return
  }

  commitDataChange(() => {
    for (const target of persistentData.value.targets) {
      target.history.splice(0, consumeThrough)
    }
  })

  selectedHistoryIndex.value = null
}

function getSkillName(skills, id) {
  return skills.find((skill) => skill.id === id)?.name || '未設定'
}

function getHistoryMatchType(history) {
  const seriesMatches = history.seriesId === currentTarget.value.goal.seriesId
  const groupMatches = history.groupId === currentTarget.value.goal.groupId

  if (seriesMatches && groupMatches) {
    return 'exact'
  }

  if (seriesMatches || groupMatches) {
    return 'partial'
  }

  return 'none'
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">G</span>
        <div>
          <h1>ゴグアーティア厳選</h1>
          <small>SELECTION ASSISTANT</small>
        </div>
      </div>

      <div class="topbar-actions">
        <button class="ghost" @click="exportData">エクスポート</button>
        <button class="ghost" @click="openImportDialog">インポート</button>
        <input ref="importFileInput" class="hidden-file-input" type="file" accept="application/json" @change="importData" />
        <RouterLink class="ghost toolbox-link" to="/">← Tool Box</RouterLink>
      </div>
    </header>

    <div class="workspace">
      <aside class="sidebar">
        <div class="side-head">
          <b>厳選対象 <em>{{ persistentData.targets.length }}</em></b>
        </div>

        <div class="target-list">
          <button
            v-for="target in persistentData.targets"
            :key="target.id"
            class="target-item"
            :class="{ active: target.id === persistentData.selectedTargetId }"
            @click="selectTarget(target.id)"
          >
            {{ target.name }}
          </button>
        </div>

        <div class="side-actions">
          <button class="outline add-target-button" @click="addTarget">
            ＋ 対象を追加
          </button>
          <div class="row">
            <button class="outline" @click="renameTarget">名前変更</button>
            <button class="danger" @click="removeTarget">削除</button>
          </div>
        </div>
      </aside>

      <main class="input-panel">
        <div class="section-title">
          <small>NOW SELECTING</small>
          <h2>{{ currentTarget.name }}</h2>
        </div>

        <section class="goal-card">
          <small>現在の狙い</small>
          <strong>{{ currentGoalText }}</strong>
        </section>

        <section>
          <div class="section-label"><b>シリーズスキル</b></div>
          <div class="skill-grid series-grid">
            <button
              v-for="skill in seriesSkills"
              :key="skill.id"
              :class="{ selected: selectedSeriesId === skill.id }"
              @click="selectSeriesSkill(skill.id)"
            >
              {{ skill.name }}
            </button>
          </div>
        </section>

        <section>
          <div class="section-label"><b>グループスキル</b></div>
          <div class="skill-grid group-grid">
            <button
              v-for="skill in groupSkills"
              :key="skill.id"
              :class="{ selected: selectedGroupId === skill.id }"
              @click="selectGroupSkill(skill.id)"
            >
              {{ skill.name }}
            </button>
          </div>
        </section>

        <div class="selection-bar">
          <strong>
            {{ isSkillPairSelected ? `${getSkillName(seriesSkills, selectedSeriesId)} ＋ ${getSkillName(groupSkills, selectedGroupId)}` : 'スキルを選択してください' }}
          </strong>
          <div>
            <button class="secondary" :disabled="!isSkillPairSelected" @click="setCurrentGoal">
              狙いに設定
            </button>
            <button class="primary" :disabled="!isSkillPairSelected" @click="recordHistory">
              記録する
            </button>
          </div>
        </div>
      </main>

      <aside class="history-panel">
        <div class="history-head">
          <h2>履歴 <em>{{ currentTarget.history.length }}</em></h2>
          <div class="history-actions">
            <button class="undo-button" :disabled="!undoSnapshot" @click="restoreUndo">
              ↶ 戻す
            </button>
            <button class="consume-button" :disabled="selectedHistoryIndex === null" @click="consumeSelectedHistory">
              消化する
            </button>
          </div>
        </div>
        <div class="history-list">
          <div
            v-for="(history, index) in currentTarget.history"
            :key="`${history.seriesId}-${history.groupId}-${index}`"
            class="history-row"
            :class="`match-${getHistoryMatchType(history)}`"
          >
            <button
              class="number"
              :class="{ chosen: selectedHistoryIndex === index }"
              @click="selectHistory(index)"
            >
              #{{ String(index + 1).padStart(2, '0') }}
            </button>
            <span :class="{ 'matched-skill': getHistoryMatchType(history) !== 'none' && history.seriesId === currentTarget.goal.seriesId }">
              {{ getSkillName(seriesSkills, history.seriesId) }}
            </span>
            <span>＋</span>
            <span :class="{ 'matched-skill': getHistoryMatchType(history) !== 'none' && history.groupId === currentTarget.goal.groupId }">
              {{ getSkillName(groupSkills, history.groupId) }}
            </span>
            <small v-if="getHistoryMatchType(history) === 'exact'">完全一致</small>
            <small v-else-if="getHistoryMatchType(history) === 'partial'">部分一致</small>
          </div>
          <p v-if="!currentTarget.history.length" class="empty-history">
            まだ記録がありません
          </p>
        </div>
      </aside>
    </div>

    <div v-if="message" class="toast" @click="message = ''">{{ message }}</div>
  </div>
</template>

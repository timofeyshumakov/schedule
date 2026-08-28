<script setup>
import { onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppStore } from './stores/appStore';
import PlanningPage from './pages/PlanningPage.vue';
import SchedulesPage from './pages/SchedulesPage.vue';
import StatusDialog from './components/StatusDialog.vue';
import EditEmployeeDialog from './components/EditEmployeeDialog.vue';

const store = useAppStore();
const {
  loading,
  errorMessage,
  successMessage,
  currentView,
  isAdmin,
} = storeToRefs(store);

watch(() => store.tableDateStart, () => store.updateTableDates());
watch(() => store.tableDateEnd, () => store.updateTableDates());

onMounted(() => store.init());
</script>

<template>
  <v-app>
    <div v-if="loading" class="loading-overlay">
      <v-progress-circular indeterminate size="64" color="primary" />
    </div>

    <v-app-bar color="primary" density="comfortable">
      <v-toolbar-title>Планирование заказов</v-toolbar-title>
      <v-spacer />
      <v-btn variant="text" @click="store.planning()">Планирование</v-btn>
      <v-btn v-if="isAdmin" variant="text" @click="store.loadTable()">Рабочие графики</v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <v-alert
          v-if="errorMessage"
          type="error"
          closable
          class="mb-2"
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>
        <v-alert
          v-if="successMessage"
          type="success"
          closable
          class="mb-2"
          @click:close="successMessage = ''"
        >
          {{ successMessage }}
        </v-alert>

        <PlanningPage v-if="currentView === 'planning'" />
        <SchedulesPage v-else-if="currentView === 'loadTable'" />

        <StatusDialog />
        <EditEmployeeDialog />
      </v-container>
    </v-main>
  </v-app>
</template>

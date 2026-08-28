<script setup>
import { onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/appStore';

const store = useAppStore();
const { loading, deals, employees } = storeToRefs(store);

onMounted(() => {
  if (!loading.value) store.updateChart?.();
});

watch([deals, employees], () => {
  store.updateChart?.();
});
</script>

<template>
  <v-card>
    <v-card-title>График загрузки</v-card-title>
    <v-card-text>
      <div class="chart-container" id="chartContainer">
        <div id="loadChart" />
      </div>
    </v-card-text>
  </v-card>
</template>

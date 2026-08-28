<script setup>
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/appStore';
import DateField from './DateField.vue';

const store = useAppStore();
const {
  selectedEmployee,
  employees,
  scheduleAction,
  scheduleActions,
  scheduleDateStart,
  scheduleDateEnd,
  showDatePickers,
  loading,
} = storeToRefs(store);
</script>

<template>
  <v-card>
    <v-card-title>Управление графиком</v-card-title>
    <v-card-text>
      <v-autocomplete
        v-model="selectedEmployee"
        :items="employees"
        label="Сотрудник"
        item-title="name"
        return-object
        :disabled="loading"
      />
      <v-autocomplete
        v-model="scheduleAction"
        :items="scheduleActions"
        item-title="text"
        item-value="value"
        label="Действие"
        :disabled="loading"
      />
      <template v-if="showDatePickers">
        <DateField v-model="scheduleDateStart" label="Дата с" :disabled="loading" />
        <DateField v-model="scheduleDateEnd" label="Дата по" :disabled="loading" />
      </template>
      <v-btn
        color="primary"
        :loading="loading"
        :disabled="!selectedEmployee"
        @click="store.applySchedule()"
      >
        Применить
      </v-btn>
    </v-card-text>
  </v-card>
</template>

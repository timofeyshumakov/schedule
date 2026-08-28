<script setup>
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/appStore';
import DateField from './DateField.vue';

const store = useAppStore();
const {
  newDeal,
  dealCheckResult,
  canAddDeal,
  checkingDeal,
  loading,
} = storeToRefs(store);
</script>

<template>
  <v-card>
    <v-card-title>Новая сделка</v-card-title>
    <v-card-text>
      <v-text-field
        v-model.number="newDeal.manDays"
        type="number"
        label="Человеко-дни"
        min="1"
        :disabled="loading"
      />
      <DateField v-model="newDeal.startDate" label="Дата с" :max="newDeal.endDate" :disabled="loading" />
      <DateField v-model="newDeal.endDate" label="Дата по" :min="newDeal.startDate" :disabled="loading" />
      <v-btn color="primary" :loading="checkingDeal" :disabled="loading" @click="store.checkDeal()">
        Проверить возможность
      </v-btn>
      <v-alert v-if="dealCheckResult" :type="canAddDeal ? 'success' : 'error'" class="mt-4">
        {{ dealCheckResult }}
      </v-alert>
      <v-btn
        v-if="canAddDeal"
        color="success"
        class="mt-2"
        :disabled="loading"
        @click="store.addDeal()"
      >
        Добавить даты в сделку
      </v-btn>
    </v-card-text>
  </v-card>
</template>

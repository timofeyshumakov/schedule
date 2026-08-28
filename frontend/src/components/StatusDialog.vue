<script setup>
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/appStore';

const store = useAppStore();
const {
  iconDialog,
  currentEmployee,
  selectedStatus,
  savingStatus,
} = storeToRefs(store);
</script>

<template>
  <v-dialog v-model="iconDialog" max-width="500">
    <v-card>
      <v-card-title>
        Выберите статус для {{ currentEmployee ? currentEmployee.name : '' }}
      </v-card-title>
      <v-card-text>
        <v-radio-group v-model="selectedStatus">
          <v-radio value="working" color="green">
            <template #label>
              <v-icon color="green">mdi-briefcase</v-icon>
              <span class="ml-2">Рабочий день</span>
            </template>
          </v-radio>
          <v-radio value="vacation" color="orange">
            <template #label>
              <v-icon color="orange">mdi-palm-tree</v-icon>
              <span class="ml-2">Отпуск</span>
            </template>
          </v-radio>
          <v-radio value="sick" color="red">
            <template #label>
              <v-icon color="red">mdi-hospital-box</v-icon>
              <span class="ml-2">Больничный</span>
            </template>
          </v-radio>
          <v-radio value="weekend" color="grey">
            <template #label>
              <v-icon color="grey">mdi-sofa</v-icon>
              <span class="ml-2">Выходной</span>
            </template>
          </v-radio>
          <v-radio value="terminated" color="grey-darken-2">
            <template #label>
              <v-icon color="grey-darken-2">mdi-account-off</v-icon>
              <span class="ml-2">Уволен</span>
            </template>
          </v-radio>
          <v-radio value="not_hired" color="blue-grey-lighten-2">
            <template #label>
              <v-icon color="blue-grey-lighten-2">mdi-account-clock</v-icon>
              <span class="ml-2">Еще не принят</span>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" :loading="savingStatus" @click="store.saveIconChange()">Сохранить</v-btn>
        <v-btn color="secondary" @click="iconDialog = false">Отмена</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

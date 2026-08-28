<script setup>
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/appStore';
import DateField from './DateField.vue';

const store = useAppStore();
const {
  editEmployeeDialog,
  editEmployeeData,
  loading,
  savingEmployee,
  deletingEmployee,
} = storeToRefs(store);
</script>

<template>
  <v-dialog v-model="editEmployeeDialog" max-width="500">
    <v-card>
      <v-card-title>Редактирование сотрудника</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="editEmployeeData.name"
          label="Имя сотрудника"
          :disabled="loading"
        />
        <DateField
          v-model="editEmployeeData.created_at"
          label="Дата приема на работу"
          :disabled="loading"
        />
        <DateField
          v-model="editEmployeeData.termination_date"
          label="Дата увольнения"
          :min="editEmployeeData.created_at"
          :disabled="loading"
          clearable
        />
        <v-checkbox
          v-model="editEmployeeData.clearTerminationDate"
          label="Снять дату увольнения"
          @update:model-value="store.clearTerminationDate()"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="error" :loading="deletingEmployee" @click="store.deleteEmployeePermanently()">
          Удалить
        </v-btn>
        <v-btn color="primary" :loading="savingEmployee" @click="store.saveEmployeeEdit()">
          Сохранить
        </v-btn>
        <v-btn color="secondary" @click="editEmployeeDialog = false">Отмена</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/appStore';

const store = useAppStore();
const {
  newEmployee,
  selectedEmployeeForDelete,
  employees,
  loading,
  addingEmployee,
  deletingEmployee,
} = storeToRefs(store);
</script>

<template>
  <v-card>
    <v-card-title>Управление сотрудниками</v-card-title>
    <v-card-text>
      <v-text-field v-model="newEmployee.name" label="Имя сотрудника" :disabled="loading" />
      <v-btn color="primary" :loading="addingEmployee" :disabled="loading" @click="store.addEmployee()">
        Добавить
      </v-btn>
      <v-autocomplete
        v-model="selectedEmployeeForDelete"
        :items="employees"
        label="Сотрудник"
        item-title="name"
        return-object
        class="mt-4"
        :disabled="loading"
      />
      <div class="buttons">
        <v-btn
          color="error"
          :loading="deletingEmployee"
          :disabled="!selectedEmployeeForDelete || loading"
          @click="store.confirmRemoveEmployee()"
        >
          Уволить
        </v-btn>
        <v-btn
          color="warning"
          :loading="loading"
          :disabled="!selectedEmployeeForDelete"
          @click="store.openEditEmployeeDialog()"
        >
          Редактировать
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

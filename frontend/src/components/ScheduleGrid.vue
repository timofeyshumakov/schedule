<script setup>
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/appStore';
import DateField from './DateField.vue';

const store = useAppStore();
const {
  tableDateStart,
  tableDateEnd,
  tableDates,
  employees,
  loading,
} = storeToRefs(store);

function onDateChange() {
  store.updateTableDates();
}
</script>

<template>
  <v-card>
    <v-card-title>Рабочие графики сотрудников</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12" md="4">
          <DateField
            v-model="tableDateStart"
            label="Дата с"
            :max="tableDateEnd"
            :disabled="loading"
            @update:model-value="onDateChange"
          />
        </v-col>
        <v-col cols="12" md="4">
          <DateField
            v-model="tableDateEnd"
            label="Дата по"
            :min="tableDateStart"
            :disabled="loading"
            @update:model-value="onDateChange"
          />
        </v-col>
      </v-row>

      <div class="table-wrapper" style="overflow-x: auto" @wheel="store.handleWheelScroll($event)">
        <table class="main-table">
          <thead>
            <tr>
              <th style="min-width: 150px">Сотрудник</th>
              <th
                v-for="date in tableDates"
                :key="date"
                class="load-cell"
                :class="{ weekend: store.isWeekend(date) }"
              >
                {{ store.formatTableDate(date) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="employee in employees" :key="employee.id">
              <td>{{ employee.name }}</td>
              <td
                v-for="date in tableDates"
                :key="date"
                class="load-cell"
                :class="store.getCellClass(employee, date)"
                @click="store.changeIcon(employee, date)"
              >
                <v-icon
                  :color="store.getCellContent(employee, date).color"
                  :title="store.getCellContent(employee, date).tooltip"
                >
                  {{ store.getCellContent(employee, date).icon }}
                </v-icon>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="available-summary">
              <td><strong>Доступно ЧД</strong></td>
              <td
                v-for="date in tableDates"
                :key="'avail-' + date"
                class="load-cell"
                :class="{ weekend: store.isWeekend(date) }"
              >
                {{ store.getAvailableManDays(date) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </v-card-text>
  </v-card>
</template>

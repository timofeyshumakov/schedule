<script setup>
import ScheduleGrid from '../components/ScheduleGrid.vue';
import ScheduleControls from '../components/ScheduleControls.vue';
import EmployeeControls from '../components/EmployeeControls.vue';
</script>

<template>
  <div>
    <v-row>
      <v-col cols="12">
        <ScheduleGrid />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="6">
        <ScheduleControls />
      </v-col>
      <v-col cols="12" md="6">
        <EmployeeControls />
      </v-col>
    </v-row>
  </div>
</template>

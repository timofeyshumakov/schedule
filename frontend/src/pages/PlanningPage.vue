<script setup>
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/appStore';
import DealForm from '../components/DealForm.vue';
import LoadChart from '../components/LoadChart.vue';

const store = useAppStore();
</script>

<template>
  <div>
    <v-row>
      <v-col cols="12" md="6">
        <DealForm />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <LoadChart />
      </v-col>
    </v-row>
  </div>
</template>

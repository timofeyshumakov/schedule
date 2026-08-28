<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  min: { type: String, default: undefined },
  max: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  clearable: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const menu = ref(false);
const local = ref(props.modelValue);

watch(() => props.modelValue, (v) => { local.value = v; });
watch(local, (v) => emit('update:modelValue', v));

function onPick(val) {
  const date = Array.isArray(val) ? val[0] : val;
  local.value = date || '';
  menu.value = false;
}

function clear() {
  local.value = null;
  emit('update:modelValue', null);
}
</script>

<template>
  <v-menu v-model="menu" :close-on-content-click="false" max-width="320">
    <template #activator="{ props: act }">
      <v-text-field
        :model-value="local"
        :label="label"
        readonly
        prepend-icon="mdi-calendar"
        :disabled="disabled"
        :clearable="clearable"
        v-bind="act"
        @click:clear="clear"
      />
    </template>
    <v-date-picker
      :model-value="local"
      locale="ru"
      :min="min"
      :max="max"
      @update:model-value="onPick"
    />
  </v-menu>
</template>

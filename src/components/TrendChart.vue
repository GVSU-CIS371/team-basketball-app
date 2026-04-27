<template>
  <div class="chart-box">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale
} from "chart.js";
import { Line } from "vue-chartjs";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale
);

const props = defineProps<{
  games: { date: string; percentage: number }[];
}>();

const chartData = computed(() => ({
  labels: props.games.map((g) => g.date),
  datasets: [
    {
      label: "Shooting %",
      data: props.games.map((g) => g.percentage),
      borderWidth: 2,
      tension: 0.25,
      pointRadius: 7,
      pointHoverRadius: 9,
      pointBackgroundColor: "#FF6B35",
      pointBorderColor: "#1a1a1a",
      pointBorderWidth: 2
    }
  ]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
};
</script>

<style scoped>
.chart-box {
  height: 300px;
}
</style>
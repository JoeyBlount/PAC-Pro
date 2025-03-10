function initProfitLossChart() {
  const ctx = document.getElementById("profitLossChart").getContext("2d");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const revenues = [15, 18, 20, 22, 24, 25]; // example data
  const expenses = [9, 10, 12, 14, 15, 16];

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Expenses",
          data: expenses,
          backgroundColor: "#e53935",
          stack: "combined",
        },
        {
          label: "Profit",
          data: revenues.map((rev, i) => rev - expenses[i]),
          backgroundColor: "#455a64",
          stack: "combined",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true },
        y: { stacked: true },
      },
    },
  });
}

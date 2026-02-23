const formatCounter = (value) => String(value).padStart(8, "0");

const generateRandomCount = () => {
  const min = 12000;
  const max = 98765432;
  const range = max - min + 1;
  return Math.floor(Math.random() * range) + min;
};

const updateVisitorCounter = () => {
  const node = document.getElementById("visitor-counter");
  if (!node) {
    return;
  }
  node.textContent = formatCounter(generateRandomCount());
};

const main = () => {
  updateVisitorCounter();
};

main();

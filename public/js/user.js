// JavaScript code to fetch the updated product data from the admin side when the user clicks a button, for example
const fetchDataButton = document.getElementById('fetchDataButton');

fetchDataButton.addEventListener('click', async () => {
  try {
    const response = await fetch('/fetch-data');
    const products = await response.json();
    

  } catch (err) {
    console.error('Failed to fetch product data:', err);
  }
});

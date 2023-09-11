// document.querySelectorAll('.addToCart').forEach(btn => {
//     btn.addEventListener('click', async (event) => {
//       event.preventDefault();
//       const productId = event.target.dataset.productId;
//       const name = event.target.previousElementSibling.previousElementSibling.textContent;
//       const price = parseFloat(event.target.previousElementSibling.textContent.slice(1));
//       const quantity = 1; // You can set the quantity as needed

//       // Send the AJAX request to add the product to the cart
//       try {
//         const response = await fetch('/add-to-cart', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({ productId, name, price, quantity })
//         });

//         if (response.ok) {
//           // Product added to cart successfully
//           // Redirect to the shopping cart page
//           window.location.href = '/shopping-cart';
//         } else {
//           console.error('Error adding product to cart:', response.statusText);
//         }
//       } catch (error) {
//         console.error('Error adding product to cart:', error);
//       }
//     });
//   });
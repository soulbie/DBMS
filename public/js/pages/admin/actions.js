// Handle Tab Switching
window.switchTab = function(tabId) {
  // Update Buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  // Update Content
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
};

// Generic Form Handler logic
const handleForm = (formId, actionPath, method, payloadBuilder) => {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Processing...';
    btn.disabled = true;

    try {
      const payload = payloadBuilder(new FormData(form));
      // Dynamic Path allowing path params
      const parsedPath = typeof actionPath === 'function' ? actionPath(payload) : actionPath;
      
      const res = await window.apiFetch(parsedPath, { 
        method, 
        body: JSON.stringify(payload) 
      });

      // Show specific message from API
      let successMsg = 'Operation successful';
      if (typeof res === 'object' && res !== null) {
          successMsg = res.Message || successMsg;
      } else if (typeof res === 'string') {
          successMsg = res;
      }
      
      window.toast.show(successMsg, 'success');
      form.reset();
    } catch (err) {
      window.toast.show(err.message || 'Operation failed', 'error');
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
}

// Ensure DOM is loaded
document.addEventListener('DOMContentLoaded', () => {

  // TOUR FORMS
  handleForm('formCreateTour', '/tours', 'POST', (fd) => ({
    title: fd.get('title'),
    cost: parseFloat(fd.get('cost')),
    maxParticipants: parseInt(fd.get('maxParticipants')),
    vehicle: fd.get('vehicle'),
    categoryId: parseInt(fd.get('categoryId')),
    imageSource: fd.get('imageSource') || '',
    departurePlace: ''
  }));

  handleForm('formDeleteTour', (p) => `/tours/${p.tourId}`, 'DELETE', (fd) => ({ 
    tourId: fd.get('tourId') 
  }));

  // CATEGORY FORMS
  handleForm('formDiscount', (p) => `/categories/${p.categoryId}/discount`, 'PATCH', (fd) => ({
    categoryId: fd.get('categoryId'),
    discountPercent: parseFloat(fd.get('percent'))
  }));

  handleForm('formMerge', '/categories/merge', 'POST', (fd) => ({
    oldCategoryId: parseInt(fd.get('oldCategoryId')),
    newCategoryId: parseInt(fd.get('newCategoryId'))
  }));

  // BOOKING FORMS
  handleForm('formUpdateStatus', (p) => `/bookings/${p.orderId}/status`, 'PATCH', (fd) => ({
    orderId: fd.get('orderId'),
    status: parseInt(fd.get('status'))
  }));

  handleForm('formCancelOrder', (p) => `/bookings/${p.orderId}/cancel`, 'PATCH', (fd) => ({
    orderId: fd.get('orderId'),
    reason: fd.get('reason')
  }));

  // ADMIN FORMS
  handleForm('formCreateAdmin', '/admin/create-admin-role', 'POST', (fd) => ({
    fullName: fd.get('fullName'),
    email: fd.get('email'),
    password: fd.get('password'),
    roleId: parseInt(fd.get('roleId'))
  }));

});

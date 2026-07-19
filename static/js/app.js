/**
 * AgriConnect - Main JavaScript
 * Handles sidebar toggle, UI interactions, and AJAX features.
 */

document.addEventListener('DOMContentLoaded', function() {

    // ── Sidebar Toggle ──────────────────────────────────────────
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.add('open');
        });
    }

    if (sidebarClose && sidebar) {
        sidebarClose.addEventListener('click', function() {
            sidebar.classList.remove('open');
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', function(e) {
        if (sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && e.target !== menuToggle) {
                sidebar.classList.remove('open');
            }
        }
    });

    // ── Auto-dismiss flash messages ─────────────────────────────
    const flashMessages = document.querySelectorAll('.flash');
    flashMessages.forEach(function(flash) {
        setTimeout(function() {
            flash.style.opacity = '0';
            flash.style.transform = 'translateY(-10px)';
            setTimeout(function() {
                flash.remove();
            }, 300);
        }, 5000);
    });

    // ── Quantity validation on order forms ──────────────────────
    const qtyInput = document.getElementById('orderQty');
    if (qtyInput) {
        qtyInput.addEventListener('input', function() {
            const max = parseInt(this.max);
            const val = parseInt(this.value);
            if (val > max) {
                this.value = max;
            }
            if (val < 1) {
                this.value = 1;
            }
        });
    }

    // ── Refresh stats periodically ──────────────────────────────
    if (window.location.pathname.includes('/dashboard')) {
        setInterval(refreshStats, 60000); // Every 60 seconds
    }
});


/**
 * Fetch and update dashboard stats via AJAX.
 */
function refreshStats() {
    fetch('/api/stats')
        .then(r => r.json())
        .then(data => {
            const statValues = document.querySelectorAll('.stat-value');
            if (statValues.length >= 2) {
                statValues[0].textContent = data.active_listings;
                statValues[1].textContent = data.registered_farmers;
            }
        })
        .catch(err => console.log('Stats refresh failed:', err));
}


/**
 * Format currency for display.
 */
function formatCurrency(amount) {
    return '£' + amount.toLocaleString('en', {maximumFractionDigits: 0}) + ' SSP';
}

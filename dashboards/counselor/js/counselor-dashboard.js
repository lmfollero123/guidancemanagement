console.log('Counselor dashboard JS loaded:', window.location.pathname);
// Clean, robust Counselor Dashboard JS using AuthHelper

document.addEventListener('DOMContentLoaded', async () => {
  // Auth check: only allow counselors
  const authResult = await AuthHelper.checkUserRole('counselor');
  if (!authResult) return; // Not authorized, already redirected

  // Set up UI
  const user = authResult.user;
  const userData = authResult.userData;
  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = user.displayName || userData.name || 'Counselor';
  const userRoleEl = document.getElementById('userRole');
  if (userRoleEl) userRoleEl.textContent = 'Counselor';
  const welcomeNameEl = document.getElementById('welcomeName');
  if (welcomeNameEl) welcomeNameEl.textContent = user.displayName || userData.name || 'Counselor';

  // --- Real Stats ---
  updateDashboardStats(user);

  // Navigation
    setupNavigation();
    
  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', e => {
      e.preventDefault();
      sessionStorage.removeItem('onCounselorDashboard');
      AuthHelper.signOut();
    });
  }

  // You can load your modules here (appointments/resources/etc)

  // --- Patch: Show real data in dashboard stat cards and widgets ---
  // 1. Stat cards
  // Upcoming Appointments (future, not cancelled)
  db.collection('appointments')
    .where('counselorId', '==', user.uid)
    .where('status', 'in', ['pending', 'approved', 'confirmed'])
    .where('appointmentDate', '>=', new Date())
    .get()
    .then(async snap => {
      // Debug: log all appointments for this counselor
      const allSnap = await db.collection('appointments').where('counselorId', '==', user.uid).get();
      console.log('[DEBUG] All appointments for this counselor:', allSnap.docs.map(d => d.data()));
      if (snap.size > 0) {
        const el = document.getElementById('stat-upcoming');
        if (el) el.textContent = snap.size;
      } else {
        // Fallback: try string 'date' field for today or future
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        db.collection('appointments')
          .where('counselorId', '==', user.uid)
          .where('status', 'in', ['pending', 'approved', 'confirmed'])
          .where('date', '>=', todayStr)
          .get()
          .then(fallbackSnap => {
            const el = document.getElementById('stat-upcoming');
            if (el) el.textContent = fallbackSnap.size;
            if (fallbackSnap.size === 0) {
              console.warn('[WARN] No upcoming appointments found. Check if appointmentDate is a Firestore Timestamp and status is correct.');
            }
          });
      }
    });
  // Active Students
  db.collection('users').where('role', '==', 'student').get().then(snap => {
    const el = document.getElementById('stat-students');
    if (el) el.textContent = snap.size;
  });
  // Resources
  db.collection('resources').get().then(snap => {
    const el = document.getElementById('stat-resources');
    if (el) el.textContent = snap.size;
  });
  // 2. Announcements widget (latest 3)
  db.collection('announcements')
    .where('audience', 'in', ['counselor', 'all'])
    .orderBy('createdAt', 'desc')
    .limit(3)
    .get()
    .then(snap => {
      const el = document.getElementById('dashboard-announcements');
      if (!el) return;
      if (snap.empty) {
        el.innerHTML = '<div class="no-data-message">No announcements.</div>';
        return;
      }
      let html = '';
      snap.forEach(doc => {
        const a = doc.data();
        const dateStr = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleDateString() : '';
        html += `<div class="announcement-card"><strong>${a.title || 'Announcement'}</strong><p>${a.message || ''}</p><span style="color:#888;font-size:0.95em;">Posted by ${a.author || 'Admin'} • ${dateStr}</span></div>`;
      });
      el.innerHTML = html;
    });
  // 3. Upcoming Appointments widget (next 3)
  db.collection('appointments')
    .where('counselorId', '==', user.uid)
    .where('status', 'in', ['pending', 'approved', 'confirmed'])
    .where('appointmentDate', '>=', new Date())
    .orderBy('appointmentDate')
    .limit(3)
    .get()
    .then(async snap => {
      if (snap.size > 0) {
        const el = document.getElementById('dashboard-appointments');
        if (!el) return;
        let html = '';
        for (const doc of snap.docs) {
          const appt = doc.data();
          let studentName = 'Unknown';
          if (appt.studentId) {
            try {
              const studentDoc = await db.collection('users').doc(appt.studentId).get();
              if (studentDoc.exists) studentName = studentDoc.data().name || 'Unnamed Student';
            } catch {}
          }
          const dateObj = appt.appointmentDate && appt.appointmentDate.toDate ? appt.appointmentDate.toDate() : new Date();
          const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          html += `<div class="appointment-item"><div class="appointment-details"><p class="appointment-title"><span class="status-badge ${appt.status}">${appt.status || 'Pending'}</span></p><p class="appointment-date"><i class="fas fa-calendar"></i> ${dateStr} at ${timeStr}</p><p class="appointment-counselor"><i class="fas fa-user"></i> With ${studentName}</p></div></div>`;
        }
        el.innerHTML = html;
      } else {
        // Fallback: try string 'date' field for today or future
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        db.collection('appointments')
          .where('counselorId', '==', user.uid)
          .where('status', 'in', ['pending', 'approved', 'confirmed'])
          .where('date', '>=', todayStr)
          .orderBy('date')
          .limit(3)
          .get()
          .then(async fallbackSnap => {
            const el = document.getElementById('dashboard-appointments');
            if (!el) return;
            if (fallbackSnap.size === 0) {
              el.innerHTML = '<div class="no-data-message">No upcoming appointments.</div>';
              console.warn('[WARN] No upcoming appointments found in fallback. Check if appointmentDate is a Firestore Timestamp and status is correct.');
              return;
            }
            let html = '';
            for (const doc of fallbackSnap.docs) {
              const appt = doc.data();
              let studentName = 'Unknown';
              if (appt.studentId) {
                try {
                  const studentDoc = await db.collection('users').doc(appt.studentId).get();
                  if (studentDoc.exists) studentName = studentDoc.data().name || 'Unnamed Student';
                } catch {}
              }
              const dateStr = appt.date || '';
              const timeStr = appt.time || '';
              html += `<div class="appointment-item"><div class="appointment-details"><p class="appointment-title"><span class="status-badge ${appt.status}">${appt.status || 'Pending'}</span></p><p class="appointment-date"><i class="fas fa-calendar"></i> ${dateStr} ${timeStr}</p><p class="appointment-counselor"><i class="fas fa-user"></i> With ${studentName}</p></div></div>`;
            }
            el.innerHTML = html;
          });
      }
    });
  // 4. Recent Resources widget (latest 3)
  db.collection('resources')
    .orderBy('createdAt', 'desc')
    .limit(3)
    .get()
    .then(snap => {
      const el = document.getElementById('dashboard-resources');
      if (!el) return;
      if (snap.empty) {
        el.innerHTML = '<div class="no-data-message">No resources available.</div>';
        return;
      }
      let html = '';
      snap.forEach(doc => {
        const r = doc.data();
        const dateStr = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        html += `<div class="resource-item"><div class="resource-details"><h4>${r.title || 'Untitled'}</h4><p class="resource-category">${r.category || ''}</p><p class="resource-date">Added: ${dateStr}</p></div><a href="#" class="view-resource-btn secondary-btn" data-id="${doc.id}">View</a></div>`;
      });
      el.innerHTML = html;
      // Add event listeners for view buttons
      const viewBtns = el.querySelectorAll('.view-resource-btn');
      viewBtns.forEach(btn => {
        btn.addEventListener('click', async e => {
          e.preventDefault();
          const id = btn.getAttribute('data-id');
          if (!id) return;
          try {
            const doc = await db.collection('resources').doc(id).get();
            if (doc.exists) {
              const resource = { id: doc.id, ...doc.data() };
              showResourcePreviewModal(resource);
            } else {
              showToast('Resource not found.', 'error');
            }
          } catch (err) {
            showToast('Error loading resource: ' + err.message, 'error');
          }
        });
      });
    });

  // --- Counselor Dashboard Widgets Logic ---
  // --- Widgets: Wellness Tips & Motivational Quotes ---
  const wellnessTips = [
    "Take a short break and stretch!",
    "Remember: You can't pour from an empty cup. Take care of yourself, too.",
    "A few deep breaths can reset your mind for the next session.",
    "Step outside for a moment of fresh air.",
    "Connect with a colleague for support or a quick chat.",
    "Practice gratitude: List 3 things that went well today.",
    "Your work makes a difference—thank you for supporting students!"
  ];
  const motivationalQuotes = [
    "The best way to take care of others is to take care of yourself.",
    "One person can make a difference, and everyone should try. – JFK",
    "You are the calm in someone else's storm.",
    "Small acts of kindness can change a student's day.",
    "Progress, not perfection. Celebrate small wins!",
    "Your support helps students grow and thrive.",
    "Self-care is not selfish—it's essential."
  ];
  let tipIdx = 0, quoteIdx = 0;
  const tipEl = document.getElementById('wellnessTipWidget');
  const quoteEl = document.getElementById('motivationalQuoteWidget');
  function rotateWidgets() {
    tipIdx = (tipIdx + 1) % wellnessTips.length;
    quoteIdx = (quoteIdx + 1) % motivationalQuotes.length;
    if (tipEl) tipEl.textContent = wellnessTips[tipIdx];
    if (quoteEl) quoteEl.textContent = '"' + motivationalQuotes[quoteIdx] + '"';
  }
  setInterval(rotateWidgets, 7000);
  // --- Widgets: Counselor Notes (private, Firestore) ---
  const notesArea = document.getElementById('counselorNotes');
  const saveNotesBtn = document.getElementById('saveNotesBtn');
  const notesStatus = document.getElementById('notesStatus');
  let notesUnsub = null;
  firebase.auth().onAuthStateChanged(user => {
    if (user && notesArea && saveNotesBtn) {
      // Load notes
      const docRef = db.collection('counselorNotes').doc(user.uid);
      docRef.get().then(doc => {
        if (doc.exists && doc.data().notes) notesArea.value = doc.data().notes;
      });
      // Live update (optional)
      if (notesUnsub) notesUnsub();
      notesUnsub = docRef.onSnapshot(doc => {
        if (doc.exists && doc.data().notes !== undefined && notesArea !== document.activeElement) {
          notesArea.value = doc.data().notes;
        }
      });
      // Save notes
      saveNotesBtn.onclick = async () => {
        const val = notesArea.value;
        notesStatus.textContent = 'Saving...';
        await docRef.set({ notes: val }, { merge: true });
        notesStatus.textContent = 'Notes saved!';
        setTimeout(() => { notesStatus.textContent = ''; }, 2000);
      };
    }
  });
  // --- Widgets: Upcoming Birthdays ---
  const birthdaysEl = document.getElementById('upcomingBirthdaysWidget');
  if (birthdaysEl) {
    birthdaysEl.textContent = 'Loading...';
    // Get students with a birthdate in the next 7 days
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    db.collection('users').where('role', '==', 'student').get().then(snap => {
      const students = [];
      snap.forEach(doc => {
        const s = doc.data();
        if (s.birthdate) {
          // Accepts YYYY-MM-DD or Timestamp
          let bday = null;
          if (typeof s.birthdate === 'string') {
            bday = new Date(s.birthdate);
          } else if (s.birthdate.toDate) {
            bday = s.birthdate.toDate();
          }
          if (bday) {
            // Set year to this year for comparison
            const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
            if (thisYearBday >= today && thisYearBday <= nextWeek) {
              students.push({ name: s.name || 'Student', date: thisYearBday });
            }
          }
        }
      });
      if (students.length === 0) {
        birthdaysEl.textContent = 'No upcoming birthdays.';
      } else {
        students.sort((a, b) => a.date - b.date);
        birthdaysEl.innerHTML = students.map(s => `<div><i class='fas fa-birthday-cake' style='color:#f39c12;'></i> <b>${s.name}</b> - ${s.date.toLocaleDateString()}</div>`).join('');
      }
    });
  }
  // --- Widgets: Quick Actions ---
  const quickAddAnnouncement = document.getElementById('quickAddAnnouncement');
  const quickUploadResource = document.getElementById('quickUploadResource');
  const quickViewCalendar = document.getElementById('quickViewCalendar');
  const quickMessageStudents = document.getElementById('quickMessageStudents');
  if (quickAddAnnouncement) quickAddAnnouncement.onclick = () => {
    const nav = document.getElementById('nav-announcements');
    if (nav) nav.click();
    setTimeout(() => {
      const addBtn = document.getElementById('addAnnouncementBtn');
      if (addBtn) addBtn.click();
    }, 400);
  };
  if (quickUploadResource) quickUploadResource.onclick = () => {
    const nav = document.getElementById('nav-resources');
    if (nav) nav.click();
    setTimeout(() => {
      const uploadBtn = document.getElementById('uploadResourceBtn');
      if (uploadBtn) uploadBtn.click();
    }, 400);
  };
  if (quickViewCalendar) quickViewCalendar.onclick = () => {
    const nav = document.getElementById('nav-appointments');
    if (nav) nav.click();
    setTimeout(() => {
      const calTab = document.querySelector('.appointment-tab[data-tab="calendar"]');
      if (calTab) calTab.click();
    }, 400);
  };
  if (quickMessageStudents) quickMessageStudents.onclick = () => {
    alert('Messaging students feature coming soon!');
  };

  // --- Setup New Appointment Modal Button ---
  function setupNewAppointmentModalEvents() {
    const openBtn = document.getElementById('newAppointmentBtn');
    const modal = document.getElementById('newAppointmentModal');
    const closeBtn = document.getElementById('closeNewAppointmentModal');
    const form = document.getElementById('newAppointmentForm');
    const errorDiv = document.getElementById('newApptError');
    if (openBtn && modal) {
      openBtn.onclick = () => {
        modal.classList.add('show');
        modal.classList.remove('hide');
        // Optionally, load students if not loaded
        const studentSelect = document.getElementById('newApptStudent');
        if (studentSelect && studentSelect.options.length <= 1) {
          db.collection('users').where('role', '==', 'student').orderBy('name').get().then(snapshot => {
            studentSelect.innerHTML = '<option value="" disabled selected>Select student</option>';
            snapshot.forEach(doc => {
              const s = doc.data();
              const opt = document.createElement('option');
              opt.value = doc.id;
              opt.textContent = s.name ? `${s.name} (${s.email || ''})` : s.email || doc.id;
              studentSelect.appendChild(opt);
            });
          });
        }
      };
    }
    if (closeBtn && modal) {
      closeBtn.onclick = () => { modal.classList.remove('show'); modal.classList.add('hide'); };
    }
    if (modal) {
      modal.onclick = e => { if (e.target === modal) { modal.classList.remove('show'); modal.classList.add('hide'); } };
    }
    // --- New Appointment Form Submit Handler ---
    if (form) {
      form.onsubmit = async function(e) {
        e.preventDefault();
        if (errorDiv) errorDiv.textContent = '';
        // Get form values
        const studentId = document.getElementById('newApptStudent').value;
        const date = document.getElementById('newApptDate').value;
        const time = document.getElementById('newApptTime').value;
        const reason = document.getElementById('newApptReason').value.trim();
        const notes = document.getElementById('newApptNotes').value.trim();
        if (!studentId || !date || !time || !reason) {
          if (errorDiv) errorDiv.textContent = 'Please fill in all required fields.';
          return;
        }
        // Get counselor info
        const user = auth.currentUser;
        if (!user) {
          if (errorDiv) errorDiv.textContent = 'Not authenticated.';
          return;
        }
        // Get student name
        let studentName = '';
        let studentEmail = '';
        try {
          const studentDoc = await db.collection('users').doc(studentId).get();
          if (studentDoc.exists) {
            const s = studentDoc.data();
            studentName = s.name || '';
            studentEmail = s.email || '';
          }
        } catch {}
        // Create appointmentDate as Date object
        const appointmentDate = new Date(`${date}T${time}`);
        // Create appointment in Firestore
        try {
          await db.collection('appointments').add({
            counselorId: user.uid,
            counselorName: user.displayName || user.name || user.email,
            studentId, // always set
            studentName, // always set
            studentEmail, // always set
            date,
            time,
            appointmentDate: firebase.firestore.Timestamp.fromDate(new Date(`${date}T${time}`)), // ensure Firestore Timestamp
            reason,
            note: notes,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          showToast('Appointment created successfully!', 'success');
          modal.classList.remove('show');
          modal.classList.add('hide');
          form.reset();
          // Refresh appointments list
          loadAppointments(user.uid);
        } catch (err) {
          if (errorDiv) errorDiv.textContent = err.message;
          showToast('Failed to create appointment: ' + err.message, 'error');
        }
      };
    }
  }
  // Run setup on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNewAppointmentModalEvents);
  } else {
    setupNewAppointmentModalEvents();
  }
  // Also run setup when appointments section is activated
  const navAppointments = document.getElementById('nav-appointments');
  if (navAppointments) {
    navAppointments.addEventListener('click', () => {
      setTimeout(setupNewAppointmentModalEvents, 300);
    });
  }
});

// --- Navigation ---
function setupNavigation() {
  const navLinks = [
    { id: 'nav-dashboard', section: 'section-dashboard' },
    { id: 'nav-appointments', section: 'section-appointments' },
    { id: 'nav-announcements', section: 'section-announcements' }, // <-- Add Announcements
    { id: 'nav-resources', section: 'section-resources' },
    { id: 'nav-students', section: 'section-students' },
    { id: 'nav-profile', section: 'section-profile' }
  ];
  navLinks.forEach(({ id, section }) => {
    const link = document.getElementById(id);
    const sec = document.getElementById(section);
    if (link && sec) {
      link.addEventListener('click', async e => {
        e.preventDefault();
        document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        transitionToSection(sec);
        // Load students when students section is activated
        if (section === 'section-students') {
          loadStudents();
        }
        // Load appointments when appointments section is activated
        if (section === 'section-appointments') {
          const authResult = await AuthHelper.checkUserRole('counselor');
          if (authResult && authResult.user) {
            loadAppointments(authResult.user.uid);
          }
        }
        // Load resources when resources section is activated
        if (section === 'section-resources') {
          loadResources();
        }
        // Load announcements when announcements section is activated
        if (section === 'section-announcements') {
          const authResult = await AuthHelper.checkUserRole('counselor');
          if (authResult && authResult.user) {
            loadAnnouncementsList(authResult.user);
            // Wire up Add Announcement button
            const addBtn = document.getElementById('addAnnouncementBtn');
            if (addBtn) {
              addBtn.onclick = () => openAnnouncementModal(authResult.user);
            }
          }
        }
        // Profile section
        if (section === 'section-profile') {
          loadProfileSection();
        }
      });
    }
  });
}

// --- Section Fade Transition Helper ---
function transitionToSection(newSection) {
  const sections = document.querySelectorAll('.section');
  const current = document.querySelector('.section.active');
  if (current && current !== newSection) {
    current.classList.remove('active');
    current.style.opacity = 0;
    setTimeout(() => {
      current.style.display = 'none';
      newSection.style.display = 'block';
      setTimeout(() => {
        newSection.classList.add('active');
        newSection.style.opacity = 1;
      }, 10);
    }, 300);
  } else {
    newSection.style.display = 'block';
    setTimeout(() => {
      newSection.classList.add('active');
      newSection.style.opacity = 1;
    }, 10);
  }
  // Hide all other sections
  sections.forEach(sec => {
    if (sec !== newSection) {
      sec.classList.remove('active');
      sec.style.opacity = 0;
      sec.style.display = 'none';
    }
  });
}

// --- Students Section ---
function loadStudents() {
  const container = document.getElementById('studentsContainer');
  container.innerHTML = '<div class="no-data-message">Loading students...</div>';
  db.collection('users').where('role', '==', 'student').get().then(snapshot => {
    if (snapshot.empty) {
      container.innerHTML = '<div class="no-data-message">No students found.</div>';
      window._lastLoadedStudents = [];
      return;
    }
    let studentsList = [];
    let html = `
      <div class="students-grid" style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 2rem;
        padding: 2rem 1rem 1rem 1rem;
        background: var(--background-color, #1a1d2b);
        border-radius: 18px;
        box-shadow: 0 4px 24px rgba(44,62,80,0.10);
        margin-bottom: 2rem;
      ">
    `;
    snapshot.forEach(doc => {
      const student = doc.data();
      student.uid = doc.id;
      studentsList.push(student);
      html += `
        <div class="student-card" data-uid="${student.uid}" style="
          background: var(--card-bg, #232946);
          color: var(--text-color, #f4f6fb);
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(44,62,80,0.13);
          padding: 2.1rem 1.2rem 1.2rem 1.2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: box-shadow 0.18s, transform 0.18s, background 0.18s;
          cursor: pointer;
          border: 1.5px solid var(--border-color, #353a4a);
          position: relative;
        ">
          <div class="student-avatar" style="margin-bottom: 1.1rem;">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || 'Student')}&background=5b7cfa&color=fff&size=96" alt="Avatar" style="
              width: 84px; height: 84px; border-radius: 50%; border: 3px solid #5b7cfa; box-shadow: 0 2px 8px rgba(44,62,80,0.13); object-fit: cover; background: #232946;">
          </div>
          <div class="student-info" style="text-align: center; width: 100%;">
            <div class="student-name" style="font-weight: 700; font-size: 1.13rem; margin-bottom: 0.3rem; letter-spacing: 0.2px;">${student.name || 'Unnamed Student'}</div>
            <div class="student-email" style="color: var(--muted-text, #b8c1ec); font-size: 0.98rem; word-break: break-all;">${student.email || ''}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    html += `<style>
      .students-grid .student-card:hover {
        box-shadow: 0 6px 24px rgba(91,124,250,0.18), 0 2px 12px rgba(44,62,80,0.13);
        background: #232946ee;
        transform: translateY(-4px) scale(1.025);
      }
      .students-grid .student-card:active {
        transform: scale(0.98);
      }
    </style>`;
    container.innerHTML = html;
    window._lastLoadedStudents = studentsList;
    // Attach click events for profile modal
    const cards = container.querySelectorAll('.student-card');
    for (const card of cards) {
      card.style.cursor = 'pointer';
      card.onclick = function() {
        const uid = card.getAttribute('data-uid');
        const found = studentsList.find(s => s.uid === uid);
        if (found) showStudentProfileModal(found);
      };
    }
  }).catch(err => {
    container.innerHTML = `<div class="no-data-message">Error loading students: ${err.message}</div>`;
    window._lastLoadedStudents = [];
  });
}

// --- Student Profile Modal ---
function showStudentProfileModal(student) {
  let modal = document.getElementById('studentProfileModal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'studentProfileModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.45);z-index:10000;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--card-bg,#232946);color:var(--text-color,#f4f6fb);padding:0;border-radius:18px;min-width:320px;max-width:95vw;box-shadow:0 8px 32px rgba(44,62,80,0.22);position:relative;max-width:420px;max-height:90vh;overflow-y:auto;border:1.5px solid var(--border-color,#353a4a);">
      <div style='display:flex;align-items:center;gap:1.1rem;padding:2.1rem 2.2rem 1.1rem 2.2rem;border-radius:18px 18px 0 0;background:linear-gradient(90deg,#5b7cfa 60%,#232946 100%);'>
        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || 'Student')}&background=5b7cfa&color=fff&size=96" alt="Avatar" style="width:64px;height:64px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(44,62,80,0.13);object-fit:cover;background:#232946;">
        <div style='flex:1;'>
          <h2 style="margin:0 0 0.2rem 0;font-size:1.22rem;font-weight:700;color:#fff;letter-spacing:0.5px;">${student.name || 'Unnamed Student'}</h2>
          <div style="color:#e0e6f7;font-size:0.99rem;">${student.email || ''}</div>
        </div>
        <button id="closeStudentProfileModal" style="background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;transition:color 0.2s;align-self:flex-start;">&times;</button>
      </div>
      <div style="padding:1.5rem 2.2rem 1.2rem 2.2rem;">
        <div id="studentAppointmentsList"></div>
      </div>
    </div>
    <style>
      #studentProfileModal .no-data-message { color: #b8c1ec; }
      @media (max-width: 600px) {
        #studentProfileModal > div { padding: 0 !important; min-width: 0 !important; }
      }
    </style>
  `;
  document.body.appendChild(modal);
  document.getElementById('closeStudentProfileModal').onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  // Fetch recent appointments for this student (existing logic follows)
  db.collection('appointments')
    .where('studentId', '==', student.uid || student.id)
    .orderBy('date', 'desc')
    .limit(10)
    .get()
    .then(snapshot => {
      let html = '';
      if (snapshot.empty) {
        html = '<div class="no-data-message">No recent appointments found.</div>';
      } else {
        html = '<div class="appointment-list">';
        snapshot.forEach(doc => {
          const appt = doc.data();
          appt.id = doc.id;
          let dateStr = appt.date || 'N/A';
          if (appt.date && appt.time) dateStr = `${appt.date} ${appt.time}`;
          let statusColor = '#f39c12';
          if (appt.status === 'approved') statusColor = '#27ae60';
          if (appt.status === 'rejected') statusColor = '#e74c3c';
          if ((appt.status || '').toLowerCase() === 'cancelled') statusColor = '#888';
          html += `
            <div class="appointment-item" style="margin-bottom:1rem;cursor:pointer;background:var(--background-color,#232946);border-radius:10px;padding:1rem 1.2rem;box-shadow:0 2px 8px rgba(44,62,80,0.10);border:1px solid var(--border-color,#353a4a);">
              <div class="appointment-header">
                <strong>Date:</strong> ${dateStr}<br>
                <strong>Status:</strong> <span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${statusColor};color:#fff;font-size:0.95em;">${appt.status || 'N/A'}</span>
              </div>
              <div class="appointment-details">
                ${appt.reason ? `<p><i class='fas fa-comment'></i> ${appt.reason}</p>` : ''}
                ${appt.note ? `<div style='font-size:0.95em;color:#b8c1ec;margin-top:0.25rem;'><b>Note:</b> ${appt.note}</div>` : ''}
              </div>
            </div>
          `;
        });
        html += '</div>';
      }
      const listDiv = document.getElementById('studentAppointmentsList');
      if (listDiv) listDiv.innerHTML = html;
      // Add click event to each appointment to open details modal
      if (!snapshot.empty) {
        const apptItems = document.querySelectorAll('#studentAppointmentsList .appointment-item');
        snapshot.docs.forEach((doc, idx) => {
          const appt = doc.data();
          appt.id = doc.id;
          if (apptItems[idx]) {
            apptItems[idx].onclick = (e) => {
              e.stopPropagation();
              showAppointmentDetailsModal(appt);
            };
          }
        });
      }
    })
    .catch(err => {
      const listDiv = document.getElementById('studentAppointmentsList');
      if (listDiv) listDiv.innerHTML = `<div class="no-data-message">Error loading appointments: ${err.message}</div>`;
    });
}

// --- Appointments Section ---
function loadAppointments(counselorId, filter = '', statusFilter = 'all') {
  const container = document.getElementById('appointmentsContainer');
  container.innerHTML = '<div class="no-data-message"><i class="fas fa-spinner fa-spin"></i> Loading appointments...</div>';

  db.collection('appointments')
    .where('counselorId', '==', counselorId)
    .orderBy('createdAt', 'desc')
    .get()
    .then(async snapshot => {
      let appointments = [];
      for (const doc of snapshot.docs) {
        const appt = doc.data();
        // Try to get student info if available
        let studentName = 'Unknown';
        let studentEmail = '';
        if (appt.studentId) {
          try {
            const studentDoc = await db.collection('users').doc(appt.studentId).get();
            if (studentDoc.exists) {
              const student = studentDoc.data();
              studentName = student.name || 'Unnamed Student';
              studentEmail = student.email || '';
            }
          } catch (err) {
            // If error, just leave as Unknown
          }
        }
        appointments.push({ ...appt, id: doc.id, studentName, studentEmail });
      }
      // Save for modal lookup
      window._lastLoadedAppointments = appointments;
      // Filter appointments by student name or email
      if (filter) {
        const f = filter.toLowerCase();
        appointments = appointments.filter(a =>
          a.studentName.toLowerCase().includes(f) || a.studentEmail.toLowerCase().includes(f)
        );
      }
      // Filter by status
      if (statusFilter !== 'all') {
        appointments = appointments.filter(a => (a.status || '').toLowerCase() === statusFilter);
      }
      // Build appointment cards
      let html = '';
      if (appointments.length === 0) {
        html += '<div class="no-data-message">No appointments found.</div>';
      }
      for (const appt of appointments) {
        // Format date: prefer appointmentDate, then date, then createdAt
        let dateStr = 'N/A';
        let timeStr = 'N/A';
        if (appt.appointmentDate && appt.appointmentDate.toDate) {
          const d = appt.appointmentDate.toDate();
          dateStr = d.toLocaleDateString();
          timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (appt.date && appt.time) {
          dateStr = appt.date;
          timeStr = appt.time;
        } else if (appt.date) {
          dateStr = appt.date;
        } else if (appt.createdAt && appt.createdAt.toDate) {
          const d = appt.createdAt.toDate();
          dateStr = d.toLocaleDateString();
          timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // Status badge
        let statusColor = '#f39c12';
        let statusLabel = (appt.status || 'Pending').charAt(0).toUpperCase() + (appt.status || 'Pending').slice(1);
        if (appt.status === 'approved') statusColor = '#27ae60';
        if (appt.status === 'rejected') statusColor = '#e74c3c';
        if ((appt.status || '').toLowerCase() === 'cancelled') statusColor = '#888';
        html += `
          <div class="appointment-card card" style="margin-bottom:1.2rem;cursor:pointer;box-shadow:0 2px 12px rgba(44,62,80,0.10);border-radius:14px;border:1.5px solid var(--border-color);padding:1.2rem 1.2rem;transition:box-shadow 0.18s,transform 0.18s;">
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.7rem;">
              <span style="display:inline-block;padding:0.3em 1em;border-radius:12px;font-size:0.98em;font-weight:600;background:${statusColor};color:#fff;">${statusLabel}</span>
              <span style="color:var(--muted-text);font-size:0.98em;"><i class="fas fa-calendar"></i> ${dateStr} ${timeStr}</span>
            </div>
            <div style="display:flex;align-items:center;gap:1.2rem;flex-wrap:wrap;">
              <div style="flex:1;min-width:180px;">
                <div style="font-weight:600;font-size:1.08em;"><i class="fas fa-user"></i> ${appt.studentName}</div>
                <div style="color:var(--muted-text);font-size:0.97em;"><i class="fas fa-envelope"></i> ${appt.studentEmail}</div>
                ${appt.reason ? `<div style='margin-top:0.5rem;'><i class='fas fa-comment'></i> <b>Reason:</b> ${appt.reason}</div>` : ''}
              </div>
              <div style="flex:1;min-width:120px;">
                ${appt.note ? `<div style='color:var(--muted-text);font-size:0.97em;'><i class='fas fa-sticky-note'></i> <b>Notes:</b> ${appt.note.length > 60 ? appt.note.substring(0,60)+'...' : appt.note}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }
      container.innerHTML = html;
      // Add click handler to each appointment card to open details modal
      setTimeout(() => {
        const items = container.querySelectorAll('.appointment-card');
        for (const item of items) {
          item.onclick = function() {
            const idx = Array.from(items).indexOf(item);
            const found = (window._lastLoadedAppointments || [])[idx];
            if (found) {
              const existingModal = document.getElementById('appointmentDetailsModal');
              if (existingModal) existingModal.remove();
              showAppointmentDetailsModal(found);
            }
          };
        }
      }, 100);
    })
    .catch(err => {
      container.innerHTML = `<div class="no-data-message">Error loading appointments: ${err.message}</div>`;
    });
}

// --- Appointment Details Modal ---
function showAppointmentDetailsModal(appt) {
  let modal = document.getElementById('appointmentDetailsModal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'appointmentDetailsModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:10000;display:flex;align-items:center;justify-content:center;';

  // --- Date/Time logic ---
  let dateStr = 'N/A';
  let timeStr = 'N/A';
  if (appt.appointmentDate && appt.appointmentDate.toDate) {
    const d = appt.appointmentDate.toDate();
    dateStr = d.toLocaleDateString();
    timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (appt.date && appt.time) {
    dateStr = appt.date;
    timeStr = appt.time;
  } else if (appt.date) {
    dateStr = appt.date;
  } else if (appt.createdAt && appt.createdAt.toDate) {
    const d = appt.createdAt.toDate();
    dateStr = d.toLocaleDateString();
    timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  let statusColor = '#f39c12';
  if (appt.status === 'approved') statusColor = '#27ae60';
  if (appt.status === 'rejected') statusColor = '#e74c3c';
  if ((appt.status || '').toLowerCase() === 'cancelled') statusColor = '#888';

  let actionsHtml = '';
  const statusLower = (appt.status || '').toLowerCase();
  // Pending: Approve, Reject, Cancel, Edit Notes
  if (statusLower === 'pending') {
    actionsHtml = `
      <div style="margin-top:1.5rem;display:flex;gap:0.7rem;flex-wrap:wrap;">
        <button id="editNotesBtn" class="secondary-btn" style="flex:1;"><i class='fas fa-edit'></i> Edit Notes</button>
        <button id="approveApptBtn" class="primary-btn" style="flex:1;">Approve</button>
        <button id="rejectApptBtn" class="danger-btn" style="flex:1;">Reject</button>
        <button id="cancelApptBtn" class="secondary-btn" style="flex:1;">Cancel</button>
        <span id="apptActionSpinner" style="display:none;margin-left:1rem;"><i class='fas fa-spinner fa-spin'></i></span>
      </div>
      <div id="apptActionError" style="color:#e74c3c;margin-top:0.7rem;display:none;"></div>
    `;
  }
  // Approved/Rejected: Edit Notes, Cancel
  else if (statusLower === 'approved' || statusLower === 'rejected') {
    actionsHtml = `
      <div style="margin-top:1.5rem;display:flex;gap:0.7rem;flex-wrap:wrap;">
        <button id="editNotesBtn" class="secondary-btn" style="flex:1;"><i class='fas fa-edit'></i> Edit Notes</button>
        <button id="cancelApptBtn" class="secondary-btn" style="flex:1;">Cancel Appointment</button>
        <span id="apptActionSpinner" style="display:none;margin-left:1rem;"><i class='fas fa-spinner fa-spin'></i></span>
      </div>
      <div id="apptActionError" style="color:#e74c3c;margin-top:0.7rem;display:none;"></div>
    `;
  }
  // Cancelled: show note if any, no actions

  modal.innerHTML = `
    <div style="background:var(--card-bg);color:var(--text-color);padding:2rem 2.5rem;border-radius:14px;min-width:320px;max-width:95vw;box-shadow:0 8px 32px rgba(44,62,80,0.18);position:relative;max-width:420px;max-height:90vh;overflow-y:auto;border:1px solid var(--border-color);">
      <button id="closeAppointmentDetailsModal" style="position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.5rem;color:var(--muted-text);cursor:pointer;transition:color 0.2s;">&times;</button>
      <h2 style="margin-top:0;font-size:1.25rem;font-weight:700;letter-spacing:0.5px;">Appointment Details</h2>
      <div style="margin-bottom:0.5rem;"><b>Student:</b> ${appt.studentName || 'Unknown'}<br><b>Email:</b> ${appt.studentEmail || ''}</div>
      <div style="margin-bottom:0.5rem;"><b>Date:</b> ${dateStr}<br><b>Time:</b> ${timeStr}</div>
      <div style="margin-bottom:0.5rem;"><b>Status:</b> <span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${statusColor};color:#fff;font-size:0.95em;">${appt.status || 'N/A'}</span></div>
      <div style="margin-bottom:0.5rem;"><b>Reason:</b> ${appt.reason || ''}</div>
      <div style="margin-bottom:0.5rem;"><b>Created At:</b> ${appt.createdAt && appt.createdAt.toDate ? appt.createdAt.toDate().toLocaleString() : ''}</div>
      <div style="margin-bottom:0.5rem;"><b>Counselor Notes:</b> <span id="apptNotesText">${appt.note ? appt.note.replace(/\n/g, '<br>') : "<span style=\"color:var(--muted-text);\">No notes yet.</span>"}</span></div>
      ${actionsHtml}
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('closeAppointmentDetailsModal').onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  // Action handlers
  const apptDocId = appt.id || appt._id;
  const user = auth.currentUser;

  // Defensive: Attach all action button listeners after modal is in DOM
  setTimeout(() => {
    // Approve
    const approveBtn = document.getElementById('approveApptBtn');
    if (approveBtn) {
      approveBtn.onclick = async () => {
        const spinner = document.getElementById('apptActionSpinner');
        const errorDiv = document.getElementById('apptActionError');
        if (spinner) spinner.style.display = 'inline-block';
        if (errorDiv) errorDiv.style.display = 'none';
        try {
          await db.collection('appointments').doc(apptDocId).update({ status: 'approved' });
          showToast('Appointment approved!', 'success');
          modal.remove();
          loadAppointments(user.uid);
        } catch (err) {
          if (errorDiv) { errorDiv.textContent = err.message; errorDiv.style.display = 'block'; }
        }
        if (spinner) spinner.style.display = 'none';
      };
    }
    // Reject
    const rejectBtn = document.getElementById('rejectApptBtn');
    if (rejectBtn) {
      rejectBtn.onclick = async () => {
        const spinner = document.getElementById('apptActionSpinner');
        const errorDiv = document.getElementById('apptActionError');
        if (spinner) spinner.style.display = 'inline-block';
        if (errorDiv) errorDiv.style.display = 'none';
        try {
          await db.collection('appointments').doc(apptDocId).update({ status: 'rejected' });
          showToast('Appointment rejected.', 'success');
          modal.remove();
          loadAppointments(user.uid);
        } catch (err) {
          if (errorDiv) { errorDiv.textContent = err.message; errorDiv.style.display = 'block'; }
        }
        if (spinner) spinner.style.display = 'none';
      };
    }
    // Cancel
    const cancelBtn = document.getElementById('cancelApptBtn');
    if (cancelBtn) {
      cancelBtn.onclick = async () => {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;
        const spinner = document.getElementById('apptActionSpinner');
        const errorDiv = document.getElementById('apptActionError');
        if (spinner) spinner.style.display = 'inline-block';
        if (errorDiv) errorDiv.style.display = 'none';
        try {
          await db.collection('appointments').doc(apptDocId).update({ status: 'cancelled' });
          showToast('Appointment cancelled.', 'success');
          modal.remove();
          loadAppointments(user.uid);
        } catch (err) {
          if (errorDiv) { errorDiv.textContent = err.message; errorDiv.style.display = 'block'; }
        }
        if (spinner) spinner.style.display = 'none';
      };
    }
    // Edit Notes
    const editNotesBtn = document.getElementById('editNotesBtn');
    if (editNotesBtn) {
      editNotesBtn.onclick = () => {
        let editModal = document.getElementById('editNotesModal');
        if (editModal) editModal.remove();
        editModal = document.createElement('div');
        editModal.id = 'editNotesModal';
        editModal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.35);z-index:11000;display:flex;align-items:center;justify-content:center;';
        // Robustly get appointment doc ID
        let thisApptDocId = appt.id || appt._id;
        if (!thisApptDocId && window._lastLoadedAppointments && Array.isArray(window._lastLoadedAppointments)) {
          const found = window._lastLoadedAppointments.find(a => {
            // Match by date, studentId, and reason as fallback
            return (
              (a.date === appt.date || (a.appointmentDate && appt.appointmentDate && a.appointmentDate.toString() === appt.appointmentDate.toString())) &&
              a.studentId === appt.studentId &&
              a.reason === appt.reason
            );
          });
          if (found && found.id) thisApptDocId = found.id;
        }
        let saveBtnDisabled = '';
        let errorMsg = '';
        if (!thisApptDocId) {
          saveBtnDisabled = 'disabled';
          errorMsg = '<div style="color:#e74c3c;margin-bottom:0.7rem;">Error: Could not determine appointment ID. Notes cannot be saved.</div>';
        }
        editModal.innerHTML = `
          <div style="background:var(--card-bg);color:var(--text-color);padding:2rem 2.2rem;border-radius:14px;min-width:320px;max-width:95vw;box-shadow:0 8px 32px rgba(44,62,80,0.18);position:relative;max-width:420px;max-height:90vh;overflow-y:auto;border:1px solid var(--border-color);display:flex;flex-direction:column;gap:1.1rem;">
            <button id="closeEditNotesModal" style="position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.5rem;color:var(--muted-text);cursor:pointer;transition:color 0.2s;">&times;</button>
            <h2 style="margin-top:0;font-size:1.15rem;font-weight:700;letter-spacing:0.5px;">Edit Counselor Notes</h2>
            <textarea id="editNotesTextarea" style="width:100%;min-height:120px;padding:1rem;border-radius:10px;border:1.5px solid var(--border-color);background:var(--background-color);color:var(--text-color);font-size:1.05rem;resize:vertical;">${appt.note ? appt.note.replace(/"/g, '&quot;') : ''}</textarea>
            <div id="editNotesError" style="color:#e74c3c;display:none;"></div>
            ${errorMsg}
            <div style="display:flex;gap:1rem;justify-content:flex-end;">
              <button id="saveNotesBtn" class="primary-btn" style="min-width:110px;" ${saveBtnDisabled}>Save</button>
              <button id="cancelEditNotesBtn" class="secondary-btn" style="min-width:110px;">Cancel</button>
            </div>
          </div>
        `;
        document.body.appendChild(editModal);
        document.getElementById('closeEditNotesModal').onclick = () => editModal.remove();
        document.getElementById('cancelEditNotesBtn').onclick = () => editModal.remove();
        editModal.onclick = e => { if (e.target === editModal) editModal.remove(); };
        // Save handler
        document.getElementById('saveNotesBtn').onclick = async () => {
          if (!thisApptDocId) return;
          const notesVal = document.getElementById('editNotesTextarea').value.trim();
          const errorDiv = document.getElementById('editNotesError');
          const saveBtn = document.getElementById('saveNotesBtn');
          errorDiv.style.display = 'none';
          saveBtn.disabled = true;
          try {
            await db.collection('appointments').doc(thisApptDocId).update({ note: notesVal });
            // Update the notes in the parent modal
            const notesText = document.getElementById('apptNotesText');
            if (notesText) notesText.innerHTML = notesVal ? notesVal.replace(/\n/g, '<br>') : '<span style=\"color:var(--muted-text);\">No notes yet.</span>';
            editModal.remove();
            showToast('Notes updated successfully', 'success');
          } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
          }
          saveBtn.disabled = false;
        };
      };
    }
  }, 0);
}

// --- Resources Section ---
function showResourceUploadModal() {
  let modal = document.getElementById('resourceUploadModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'resourceUploadModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.45);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:var(--card-bg,#232946);color:var(--text-color,#f4f6fb);padding:0;border-radius:20px;min-width:320px;max-width:95vw;box-shadow:0 8px 32px rgba(44,62,80,0.22);position:relative;width:100%;max-width:420px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#5b7cfa 60%,#232946 100%);padding:1.2rem 2.2rem 1.2rem 1.2rem;display:flex;align-items:center;gap:1rem;">
          <span style='font-size:2rem;color:#fff;'><i class="fas fa-link"></i></span>
          <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:#fff;letter-spacing:0.5px;flex:1;">Add Resource Link</h2>
          <button id="closeResourceUploadModal" style="background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;transition:color 0.2s;">&times;</button>
        </div>
        <div style="padding:2rem 2.2rem 1.5rem 2.2rem;">
          <div id="resourceUploadError" style="color:#e74c3c;margin-bottom:1rem;display:none;"></div>
          <form id="resourceUploadForm" autocomplete="off">
            <div class="form-group" style="margin-bottom:1.1rem;">
              <label style="font-weight:600;">Title <span style='color:#e74c3c;'>*</span>
                <input type="text" id="resourceUploadTitle" required style="width:100%;padding:0.7rem 1rem;margin-top:0.3rem;border-radius:8px;border:1.5px solid #353a4a;background:var(--background-color,#232946);color:var(--text-color,#f4f6fb);font-size:1.05rem;">
              </label>
              <div style="font-size:0.93em;color:#b8c1ec;margin-top:0.2rem;">Give your resource a clear, descriptive title.</div>
            </div>
            <div class="form-group" style="margin-bottom:1.1rem;">
              <label style="font-weight:600;">Description
                <textarea id="resourceUploadDesc" style="width:100%;padding:0.7rem 1rem;margin-top:0.3rem;border-radius:8px;border:1.5px solid #353a4a;background:var(--background-color,#232946);color:var(--text-color,#f4f6fb);font-size:1.05rem;resize:vertical;min-height:60px;"></textarea>
              </label>
              <div style="font-size:0.93em;color:#b8c1ec;margin-top:0.2rem;">Optional: Add a short summary or instructions.</div>
            </div>
            <div class="form-group" style="margin-bottom:1.1rem;">
              <label style="font-weight:600;">Category <span style='color:#e74c3c;'>*</span>
                <select id="resourceUploadCategory" required style="width:100%;padding:0.7rem 1rem;margin-top:0.3rem;border-radius:8px;border:1.5px solid #353a4a;background:var(--background-color,#232946);color:var(--text-color,#f4f6fb);font-size:1.05rem;"></select>
              </label>
            </div>
            <div class="form-group" style="margin-bottom:1.1rem;">
              <label style="font-weight:600;">External URL <span style='color:#e74c3c;'>*</span>
                <input type="url" id="resourceUploadUrl" placeholder="https://" style="width:100%;padding:0.7rem 1rem;margin-top:0.3rem;border-radius:8px;border:1.5px solid #353a4a;background:var(--background-color,#232946);color:var(--text-color,#f4f6fb);font-size:1.05rem;" required>
              </label>
              <div style="font-size:0.93em;color:#b8c1ec;margin-top:0.2rem;">Paste a direct link to the resource (PDF, image, website, etc.).</div>
            </div>
            <div id="resourceUrlPreview" style="margin-bottom:1.1rem;display:none;"></div>
            <button type="submit" class="btn primary-btn" style="margin-top:0.7rem;width:100%;font-size:1.08rem;transition:background 0.18s;background:#5b7cfa;color:#fff;">Add Resource</button>
            <div id="resourceUploadSpinner" style="display:none;text-align:center;margin-top:1.2rem;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:#5b7cfa;"></i><div style='color:#5b7cfa;font-size:1.01rem;margin-top:0.3rem;'>Uploading...</div></div>
          </form>
        </div>
      </div>
      <style>
        #resourceUploadModal .btn.primary-btn:hover { background: #232946 !important; color: #fff !important; }
        #resourceUploadModal input:focus, #resourceUploadModal textarea:focus, #resourceUploadModal select:focus {
          outline: 2px solid #5b7cfa; border-color: #5b7cfa;
        }
        @media (max-width: 600px) {
          #resourceUploadModal > div { padding: 0 !important; min-width: 0 !important; }
        }
      </style>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeResourceUploadModal').onclick = () => modal.remove();
    // Populate categories
    const catSelect = document.getElementById('resourceUploadCategory');
    catSelect.innerHTML = '<option value="">Select Category</option>';
    db.collection('resourceCategories').orderBy('name').get().then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = data.name;
        option.textContent = data.name;
        catSelect.appendChild(option);
      });
    });
    // Live preview for external URL
    const urlInput = document.getElementById('resourceUploadUrl');
    const previewDiv = document.getElementById('resourceUrlPreview');
    urlInput.addEventListener('input', function() {
      const url = urlInput.value.trim();
      previewDiv.innerHTML = '';
      previewDiv.style.display = 'none';
      if (!url) return;
      // Show preview for images and PDFs
      if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        previewDiv.innerHTML = `<img src="${url}" alt="Preview" style="max-width:100%;max-height:180px;display:block;margin:0 auto 0.5rem auto;border-radius:8px;box-shadow:0 2px 8px rgba(44,62,80,0.12);">`;
        previewDiv.style.display = 'block';
      } else if (url.match(/\.(pdf)$/i)) {
        previewDiv.innerHTML = `<iframe src="${url}#toolbar=0" style="width:100%;height:180px;border:none;border-radius:8px;box-shadow:0 2px 8px rgba(44,62,80,0.12);"></iframe>`;
        previewDiv.style.display = 'block';
      } else if (url.startsWith('http')) {
        previewDiv.innerHTML = `<a href="${url}" target="_blank" style="color:#5b7cfa;text-decoration:underline;font-size:1.01em;">Preview Link</a>`;
        previewDiv.style.display = 'block';
      }
    });
    // Form submit
    document.getElementById('resourceUploadForm').onsubmit = async function(e) {
      e.preventDefault();
      const errorDiv = document.getElementById('resourceUploadError');
      const spinner = document.getElementById('resourceUploadSpinner');
      errorDiv.style.display = 'none';
      spinner.style.display = 'block';
      const title = document.getElementById('resourceUploadTitle').value.trim();
      const description = document.getElementById('resourceUploadDesc').value.trim();
      const category = document.getElementById('resourceUploadCategory').value;
      const externalUrl = document.getElementById('resourceUploadUrl').value.trim();
      if (!title || !category || !externalUrl) {
        errorDiv.textContent = 'Please provide a title, category, and an external URL.';
        errorDiv.style.display = 'block';
        spinner.style.display = 'none';
        return;
      }
      try {
        const resourceData = {
          title,
          description,
          category,
          externalUrl,
          uploadedBy: auth.currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('resources').add(resourceData);
        createNotification({
          toUid: auth.currentUser.uid,
          message: `Resource "${title}" added successfully!`,
          type: 'resource',
          link: ''
        });
        modal.remove();
        loadResources();
        alert('Resource link added successfully!');
      } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
      }
      spinner.style.display = 'none';
    };
  } else {
    modal.style.display = 'flex';
  }
}

// --- Resource Preview Modal ---
function showResourcePreviewModal(resource) {
  let modal = document.getElementById('resourcePreviewModal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'resourcePreviewModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.45);z-index:10000;display:flex;align-items:center;justify-content:center;';
  let previewHtml = '';
  // Image preview
  if (resource.fileUrl && resource.fileType && ['jpg','jpeg','png'].includes(resource.fileType)) {
    previewHtml = `<img src="${resource.fileUrl}" alt="Preview" style="max-width:350px;max-height:350px;display:block;margin:0 auto 1rem auto;border-radius:8px;box-shadow:0 2px 8px rgba(44,62,80,0.12);">`;
  } else if (resource.fileUrl && resource.fileType && resource.fileType === 'pdf') {
    previewHtml = `<iframe src="${resource.fileUrl}#toolbar=0" style="width:350px;height:400px;border:none;border-radius:8px;box-shadow:0 2px 8px rgba(44,62,80,0.12);margin-bottom:1rem;"></iframe>`;
  } else {
    previewHtml = '';
  }
  modal.innerHTML = `
    <div style="background:var(--card-bg,#232946);color:var(--text-color,#f4f6fb);padding:2rem 2.5rem;border-radius:16px;min-width:320px;max-width:95vw;box-shadow:0 8px 32px rgba(44,62,80,0.22);position:relative;max-height:90vh;overflow-y:auto;">
      <button id="closeResourcePreviewModal" style="position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.5rem;color:#b8c1ec;cursor:pointer;transition:color 0.2s;">&times;</button>
      <h2 style="margin-top:0;margin-bottom:1.2rem;font-size:1.22rem;font-weight:700;letter-spacing:0.5px;color:#fff;">${resource.title || 'Untitled Resource'}</h2>
      <div style="margin-bottom:1rem;">${previewHtml}</div>
      <div style="margin-bottom:0.5rem;"><b>Description:</b> <span style='color:#b8c1ec;'>${resource.description || ''}</span></div>
      <div style="margin-bottom:0.5rem;"><b>Category:</b> <span style='color:#b8c1ec;'>${resource.category || 'Uncategorized'}</span></div>
      <div style="margin-bottom:0.5rem;"><b>Uploader:</b> <span style='color:#b8c1ec;'>${resource.uploader || ''}</span></div>
      <div style="margin-bottom:1rem;"><b>Date Added:</b> <span style='color:#b8c1ec;'>${resource.createdAt && resource.createdAt.toDate ? resource.createdAt.toDate().toLocaleString() : ''}</span></div>
      <div style="margin-bottom:1rem;">
        ${resource.fileUrl ? `<a href="${resource.fileUrl}" class="btn primary-btn" target="_blank" style='background:#5b7cfa;color:#fff;'>Download</a>` : resource.externalUrl ? `<a href="${resource.externalUrl}" class="btn primary-btn" target="_blank" style='background:#5b7cfa;color:#fff;'>Visit</a>` : ''}
      </div>
    </div>
    <style>
      #resourcePreviewModal .btn.primary-btn:hover { background: #232946 !important; color: #fff !important; }
      #resourcePreviewModal h2 { color: #fff; }
      @media (max-width: 600px) {
        #resourcePreviewModal > div { padding: 1.2rem !important; min-width: 0 !important; }
      }
    </style>
  `;
  document.body.appendChild(modal);
  document.getElementById('closeResourcePreviewModal').onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

// --- Resource Edit/Delete ---
function showResourceEditModal(resource, onSave) {
  let modal = document.getElementById('resourceEditModal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'resourceEditModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:10000;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;padding:2rem 2.5rem;border-radius:12px;min-width:320px;max-width:95vw;box-shadow:0 8px 32px rgba(44,62,80,0.18);position:relative;">
      <button id="closeResourceEditModal" style="position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.5rem;color:#888;cursor:pointer;">&times;</button>
      <h2 style="margin-top:0;">Edit Resource</h2>
      <div id="resourceEditError" style="color:#e74c3c;margin-bottom:1rem;display:none;"></div>
      <form id="resourceEditForm">
        <div class="form-group"><label>Title:<br><input type="text" id="resourceEditTitle" required style="width:100%;padding:0.5rem;" value="${resource.title || ''}"></label></div>
        <div class="form-group"><label>Description:<br><textarea id="resourceEditDesc" style="width:100%;padding:0.5rem;">${resource.description || ''}</textarea></label></div>
        <div class="form-group"><label>Category:<br><select id="resourceEditCategory" required style="width:100%;padding:0.5rem;"></select></label></div>
        <div class="form-group"><label>Replace File:<br><input type="file" id="resourceEditFile" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"></label><small>Max 10MB. PDF, DOC, PPT, XLS, JPG, PNG.</small></div>
        <div class="form-group"><label>Or External URL:<br><input type="url" id="resourceEditUrl" placeholder="https://" style="width:100%;padding:0.5rem;" value="${resource.externalUrl || ''}"></label></div>
        <button type="submit" class="btn primary-btn" style="margin-top:1rem;width:100%;">Save Changes</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('closeResourceEditModal').onclick = () => modal.remove();
  // Populate categories
  const catSelect = document.getElementById('resourceEditCategory');
  catSelect.innerHTML = '<option value="">Select Category</option>';
  db.collection('resourceCategories').orderBy('name').get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      const option = document.createElement('option');
      option.value = data.name;
      option.textContent = data.name;
      catSelect.appendChild(option);
    });
    catSelect.value = resource.category || '';
  });
  // Form submit
  document.getElementById('resourceEditForm').onsubmit = async function(e) {
        e.preventDefault();
    const errorDiv = document.getElementById('resourceEditError');
    errorDiv.style.display = 'none';
    const title = document.getElementById('resourceEditTitle').value.trim();
    const description = document.getElementById('resourceEditDesc').value.trim();
    const category = document.getElementById('resourceEditCategory').value;
    const file = document.getElementById('resourceEditFile').files[0];
    const externalUrl = document.getElementById('resourceEditUrl').value.trim();
    if (!title || !category || (!file && !externalUrl && !resource.fileUrl)) {
      errorDiv.textContent = 'Please provide a title, category, and either a file or external URL.';
      errorDiv.style.display = 'block';
            return;
        }
    if (file && file.size > 10 * 1024 * 1024) {
      errorDiv.textContent = 'File size exceeds 10MB limit.';
      errorDiv.style.display = 'block';
      return;
    }
    if (file && externalUrl) {
      errorDiv.textContent = 'Please provide either a file or an external URL, not both.';
      errorDiv.style.display = 'block';
      return;
    }
    try {
      const updateData = {
            title,
            description,
            category,
            externalUrl: externalUrl || null
        };
      if (file) {
        const fileType = file.name.split('.').pop().toLowerCase();
        const storageRef = storage.ref().child(`resources/${Date.now()}_${file.name}`);
            await storageRef.put(file);
        const fileUrl = await storageRef.getDownloadURL();
        updateData.fileUrl = fileUrl;
        updateData.fileType = fileType;
      } else if (!externalUrl && resource.fileUrl) {
        // Keep existing file if no new file or URL
        updateData.fileUrl = resource.fileUrl;
        updateData.fileType = resource.fileType;
      }
      await db.collection('resources').doc(resource.id).update(updateData);
      modal.remove();
      loadResources();
      alert('Resource updated successfully!');
      if (onSave) onSave();
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    }
  };
}

async function deleteResource(resource) {
  if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) return;
  try {
    // Delete file from storage if present
    if (resource.fileUrl && resource.fileType) {
      const fileName = resource.fileUrl.split('/').pop().split('?')[0];
      await storage.ref().child(`resources/${fileName}`).delete().catch(()=>{});
    }
    await db.collection('resources').doc(resource.id).delete();
    loadResources();
    alert('Resource deleted!');
  } catch (err) {
    alert('Error deleting resource: ' + err.message);
  }
}

// Patch loadResources to add edit/delete buttons for own resources
const origLoadResourcesWithEdit = loadResources;
loadResources = function(category = '', search = '') {
  origLoadResourcesWithEdit(category, search);
  setTimeout(async () => {
    const container = document.getElementById('resourcesContainer');
    if (!container) return;
    const cards = container.querySelectorAll('.resource-card');
    const user = auth.currentUser;
    // Get resource IDs and add edit/delete buttons for own resources
    for (const card of cards) {
      const title = card.querySelector('.student-name')?.textContent || '';
      const categoryText = card.querySelector('.resource-card-meta')?.innerHTML.match(/Category:<\/b> ([^<]*)/i)?.[1] || '';
      const uploader = card.querySelector('.resource-card-meta')?.innerHTML.match(/Uploader:<\/b> ([^<]*)/i)?.[1] || '';
      // Find the resource in the current list (by title, category, uploader)
      let found = null;
      for (const r of window._lastLoadedResources || []) {
        if (r.title === title && r.category === categoryText && r.uploader === uploader) {
          found = r;
          break;
        }
      }
      if (found && user && found.uploadedBy === user.uid) {
        // Add edit/delete buttons if not already present
        let actions = card.querySelector('.resource-card-actions');
        if (actions && !actions.querySelector('.edit-resource-btn')) {
          const editBtn = document.createElement('button');
          editBtn.className = 'btn secondary-btn edit-resource-btn';
          editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
          editBtn.onclick = (e) => { e.stopPropagation(); showResourceEditModal({ ...found, id: found.id || found._id }, () => loadResources()); };
          const delBtn = document.createElement('button');
          delBtn.className = 'btn danger-btn delete-resource-btn';
          delBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
          delBtn.onclick = (e) => { e.stopPropagation(); deleteResource({ ...found, id: found.id || found._id }); };
          actions.appendChild(editBtn);
          actions.appendChild(delBtn);
        }
      }
    }
  }, 400);
};

function loadResourceCategoriesForFilter() {
  const filter = document.getElementById('resourcesCategoryFilter');
  if (!filter) return;
  filter.innerHTML = '<option value="">All Categories</option>';
  db.collection('resourceCategories').orderBy('name').get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      const option = document.createElement('option');
      option.value = data.name;
      option.textContent = data.name;
      filter.appendChild(option);
    });
  });
}

function loadResources(category = '', search = '') {
  const container = document.getElementById('resourcesContainer');
  // Ensure upload button is present and not duplicated
  let uploadBtn = document.getElementById('uploadResourceBtn');
  if (!uploadBtn) {
    uploadBtn = document.createElement('button');
    uploadBtn.id = 'uploadResourceBtn';
    uploadBtn.className = 'btn primary-btn';
    uploadBtn.style = 'margin-bottom:1rem;float:right;';
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Resource';
    uploadBtn.onclick = showResourceUploadModal;
    // Insert above the container
    container.parentNode.insertBefore(uploadBtn, container);
  }
  // Move the button to the top if it got pushed down
  if (uploadBtn.nextSibling !== container) {
    uploadBtn.parentNode.insertBefore(uploadBtn, container);
  }
  container.innerHTML = '<div class="no-data-message"><i class="fas fa-spinner fa-spin"></i> Loading resources...</div>';
  let query = db.collection('resources');
  if (category) {
    query = query.where('category', '==', category);
  }
  query.orderBy('createdAt', 'desc').get().then(async snapshot => {
    let resources = [];
    for (const doc of snapshot.docs) {
      const r = doc.data();
      // Get uploader name
      let uploader = '';
      if (r.uploadedBy) {
        try {
          const userDoc = await db.collection('users').doc(r.uploadedBy).get();
                if (userDoc.exists) {
            const user = userDoc.data();
            uploader = user.name || user.email || '';
          }
        } catch {}
      }
      resources.push({ ...r, uploader });
    }
    // Search filter
    if (search) {
      const s = search.toLowerCase();
      resources = resources.filter(r =>
        (r.title && r.title.toLowerCase().includes(s)) ||
        (r.description && r.description.toLowerCase().includes(s))
      );
    }
    // Build search bar and category filter
    let html = `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
        <input type="text" id="resourcesSearch" placeholder="Search by title or description..." style="flex:1;min-width:180px;padding:0.5rem;">
        <select id="resourcesCategoryFilter" style="padding:0.5rem;"></select>
      </div>
    `;
    if (resources.length === 0) {
      html += '<div class="no-data-message">No resources found.</div>';
        } else {
      html += '<div class="students-grid">';
      for (const r of resources) {
        // File type icon
        let icon = '<i class="fas fa-file-alt"></i>';
        if (r.fileType) {
          if (r.fileType.includes('pdf')) icon = '<i class="fas fa-file-pdf" style="color:#e74c3c"></i>';
          else if (r.fileType.includes('doc')) icon = '<i class="fas fa-file-word" style="color:#2980b9"></i>';
          else if (r.fileType.includes('ppt')) icon = '<i class="fas fa-file-powerpoint" style="color:#e67e22"></i>';
          else if (r.fileType.includes('xls')) icon = '<i class="fas fa-file-excel" style="color:#27ae60"></i>';
          else if (r.fileType.includes('jpg') || r.fileType.includes('png')) icon = '<i class="fas fa-file-image" style="color:#5b7cfa"></i>';
        }
        html += `
          <div class="student-card resource-card">
            <div class="student-avatar file-icon">${icon}</div>
            <div class="student-info resource-card-body">
              <div class="student-name"><strong>${r.title || 'Untitled Resource'}</strong></div>
              <div class="resource-card-description">${r.description || ''}</div>
              <div class="resource-card-meta"><b>Category:</b> ${r.category || 'Uncategorized'}<br><b>Uploader:</b> ${r.uploader || ''}</div>
              <div class="resource-card-actions">
                ${r.fileUrl ? `<a href="${r.fileUrl}" class="btn primary-btn" target="_blank">Download</a>` : r.externalUrl ? `<a href="${r.externalUrl}" class="btn primary-btn" target="_blank">Visit</a>` : ''}
              </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }
    container.innerHTML = html;
    // Populate and handle category filter
    loadResourceCategoriesForFilter();
    const catFilter = document.getElementById('resourcesCategoryFilter');
    if (catFilter) {
      catFilter.value = category;
      catFilter.onchange = () => loadResources(catFilter.value, document.getElementById('resourcesSearch').value);
    }
    // Handle search
    const searchInput = document.getElementById('resourcesSearch');
    if (searchInput) {
      searchInput.value = search;
      searchInput.oninput = () => loadResources(catFilter.value, searchInput.value);
    }
  }).catch(err => {
    container.innerHTML = `<div class="no-data-message">Error loading resources: ${err.message}</div>`;
  });
}

// --- Profile Section ---
function updateSidebarUserInfo(user) {
  const name = user.displayName || user.name || user.email || 'Counselor';
  const avatarUrl = user.photoURL
    ? user.photoURL
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=5b7cfa&color=fff&size=128`;
  const nameEl = document.getElementById('sidebarUserName');
  const avatarEl = document.getElementById('sidebarUserAvatar');
  if (nameEl) nameEl.textContent = name;
  if (avatarEl) avatarEl.src = avatarUrl;
}

function loadProfileSection() {
  const container = document.getElementById('profileContainer');
  container.innerHTML = '<div class="no-data-message"><i class="fas fa-spinner fa-spin"></i> Loading profile...</div>';
  const user = auth.currentUser;
  if (!user) {
    container.innerHTML = '<div class="no-data-message">Not logged in.</div>';
    return;
  }
  db.collection('users').doc(user.uid).get().then(doc => {
    if (!doc.exists) {
      container.innerHTML = '<div class="no-data-message">Profile not found.</div>';
      return;
    }
    const data = doc.data();
    container.innerHTML = `
      <div class="profile-info">
        <div class="user-details" style="width:100%;max-width:400px;margin:0 auto;">
          <div class="form-group">
            <label for="profileName"><b>Name:</b></label>
            <input type="text" id="profileName" value="${data.name || user.displayName || ''}" style="width:100%;padding:0.5rem;">
          </div>
          <div class="form-group">
            <label><b>Email:</b></label>
            <input type="email" value="${user.email}" style="width:100%;padding:0.5rem;" disabled>
          </div>
          <div class="form-group">
            <button id="saveProfileBtn" class="btn primary-btn" style="margin-right:1rem;">Save Changes</button>
            <button id="resetPasswordBtn" class="btn secondary-btn">Reset Password</button>
            <span id="profileSpinner" style="display:none;margin-left:1rem;"><i class='fas fa-spinner fa-spin'></i></span>
          </div>
          <div id="profileMsg" style="margin-top:1rem;"></div>
        </div>
      </div>
    `;
    // Save changes
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
      saveBtn.onclick = async function() {
        const nameInput = document.getElementById('profileName');
        const msgDiv = document.getElementById('profileMsg');
        const spinner = document.getElementById('profileSpinner');
        msgDiv.textContent = '';
        spinner.style.display = 'inline-block';
        try {
          await db.collection('users').doc(user.uid).update({ name: nameInput.value.trim() });
          await user.updateProfile({ displayName: nameInput.value.trim() });
          msgDiv.style.color = '#27ae60';
          msgDiv.textContent = 'Profile updated!';
          // Update sidebar avatar and name
          updateSidebarUserInfo({
            displayName: nameInput.value.trim(),
            name: nameInput.value.trim(),
            email: user.email,
            photoURL: user.photoURL
          });
        } catch (err) {
          msgDiv.style.color = '#e74c3c';
          msgDiv.textContent = err.message;
        }
        spinner.style.display = 'none';
      };
    }
    // Password reset
    const resetBtn = document.getElementById('resetPasswordBtn');
    if (resetBtn) {
      resetBtn.onclick = async function() {
        const msgDiv = document.getElementById('profileMsg');
        const spinner = document.getElementById('profileSpinner');
        msgDiv.textContent = '';
        spinner.style.display = 'inline-block';
        try {
          await auth.sendPasswordResetEmail(user.email);
          msgDiv.style.color = '#27ae60';
          msgDiv.textContent = 'Password reset email sent! Check your inbox.';
        } catch (err) {
          msgDiv.style.color = '#e74c3c';
          msgDiv.textContent = err.message;
        }
        spinner.style.display = 'none';
      };
    }
  }).catch(err => {
    container.innerHTML = `<div class="no-data-message">Error loading profile: ${err.message}</div>`;
  });
}

// Also load profile if Profile section is active on page load
if (document.getElementById('section-profile')?.classList.contains('active')) {
  loadProfileSection();
}

// --- Dashboard Analytics Overview ---
let appointmentsTrendsChart = null;
let appointmentsStatusChart = null;

async function loadDashboardAnalytics(counselorId) {
  // Show loading states
  if (window.Chart) {
    if (appointmentsTrendsChart) appointmentsTrendsChart.destroy();
    if (appointmentsStatusChart) appointmentsStatusChart.destroy();
  }
  document.getElementById('appointmentsTrendsChart').parentNode.querySelector('h3').textContent = 'Appointment Trends';
  document.getElementById('appointmentsStatusChart').parentNode.querySelector('h3').textContent = 'Status Breakdown';
  document.getElementById('studentEngagementStat').textContent = '...';
  document.getElementById('recentActivityFeed').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading activity...';

  // 1. Fetch all appointments for this counselor
  const apptSnap = await db.collection('appointments')
    .where('counselorId', '==', counselorId)
    .orderBy('createdAt', 'desc')
    .get();
  const appts = apptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Debug: log all appointments
  console.log('Counselor appointments for chart:', appts.map(a => ({id: a.id, status: a.status, date: a.date, appointmentDate: a.appointmentDate, studentId: a.studentId})));
  // --- Appointment Trends (last 6 months) ---
  const months = [];
  const monthLabels = [];
            const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthLabels.push(label);
    months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
  }
  // Count appointments per month (support both 'date' and 'appointmentDate')
  const monthCounts = months.map(({ y, m }) =>
    appts.filter(a => {
      let apptYear, apptMonth;
      if (a.date && typeof a.date === 'string') {
        const [yy, mm] = a.date.split('-');
        apptYear = parseInt(yy);
        apptMonth = parseInt(mm);
      } else if (a.appointmentDate && a.appointmentDate.toDate) {
        const d = a.appointmentDate.toDate();
        apptYear = d.getFullYear();
        apptMonth = d.getMonth() + 1;
      } else {
        return false;
      }
      return apptYear === y && apptMonth === m;
    }).length
  );
  const ctxTrends = document.getElementById('appointmentsTrendsChart').getContext('2d');
  appointmentsTrendsChart = new Chart(ctxTrends, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Appointments',
        data: monthCounts,
        borderColor: '#5b7cfa',
        backgroundColor: 'rgba(91,124,250,0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#5b7cfa',
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision:0 } } },
      responsive: true,
      maintainAspectRatio: true,
    }
  });
  // --- Status Breakdown ---
  const statusCounts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  appts.forEach(a => {
    const s = (a.status || '').toLowerCase();
    if (statusCounts[s] !== undefined) statusCounts[s]++;
  });
  // Debug: log status counts
  console.log('Status counts for counselor chart:', statusCounts);
  const ctxStatus = document.getElementById('appointmentsStatusChart').getContext('2d');
  appointmentsStatusChart = new Chart(ctxStatus, {
    type: 'pie',
    data: {
      labels: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.approved, statusCounts.rejected, statusCounts.cancelled],
        backgroundColor: ['#f39c12','#27ae60','#e74c3c','#888'],
        borderWidth: 1
      }]
    },
    options: {
      plugins: { legend: { position: 'bottom' } },
      responsive: true,
      maintainAspectRatio: true,
    }
  });
  // --- Student Engagement (unique students this month) ---
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const studentsThisMonth = new Set(
    appts.filter(a => {
      let apptYear, apptMonth;
      if (a.date && typeof a.date === 'string') {
        const [yy, mm] = a.date.split('-');
        apptYear = parseInt(yy);
        apptMonth = parseInt(mm);
      } else if (a.appointmentDate && a.appointmentDate.toDate) {
        const d = a.appointmentDate.toDate();
        apptYear = d.getFullYear();
        apptMonth = d.getMonth() + 1;
      } else {
        return false;
      }
      return apptYear === thisYear && apptMonth === thisMonth;
    }).map(a => a.studentId)
  );
  document.getElementById('studentEngagementStat').textContent = studentsThisMonth.size;
  // --- Recent Activity Feed (last 5 actions) ---
  // We'll use appointments as activity for now
  const recent = appts.slice(0, 5);
  let activityHtml = '';
  if (recent.length === 0) {
    activityHtml = '<div class="no-data-message">No recent activity.</div>';
  } else {
    activityHtml = '<ul style="list-style:none;padding:0;">';
    recent.forEach(a => {
      let icon = '<i class="fas fa-calendar-alt" style="color:#5b7cfa"></i>';
      let action = 'Appointment';
      if ((a.status || '').toLowerCase() === 'approved') {
        icon = '<i class="fas fa-check-circle" style="color:#27ae60"></i>';
        action = 'Approved';
      } else if ((a.status || '').toLowerCase() === 'rejected') {
        icon = '<i class="fas fa-times-circle" style="color:#e74c3c"></i>';
        action = 'Rejected';
      } else if ((a.status || '').toLowerCase() === 'cancelled') {
        icon = '<i class="fas fa-ban" style="color:#888"></i>';
        action = 'Cancelled';
      } else if ((a.status || '').toLowerCase() === 'pending') {
        icon = '<i class="fas fa-hourglass-half" style="color:#f39c12"></i>';
        action = 'Pending';
      }
      let dateStr = a.date || '';
      if (a.date && a.time) dateStr = `${a.date} ${a.time}`;
      else if (a.appointmentDate && a.appointmentDate.toDate) {
        const d = a.appointmentDate.toDate();
        dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      activityHtml += `<li style="margin-bottom:0.75rem;display:flex;align-items:center;gap:0.75rem;">
        ${icon}
        <span><b>${action}</b> with <b>${a.studentName || 'Student'}</b><br><span style='font-size:0.95em;color:#888;'>${dateStr}</span></span>
      </li>`;
    });
    activityHtml += '</ul>';
  }
  document.getElementById('recentActivityFeed').innerHTML = activityHtml;
}

// Patch navigation to load analytics when dashboard is shown
const origSetupNavigation = setupNavigation;
setupNavigation = function() {
  origSetupNavigation();
  const dashboardLink = document.getElementById('nav-dashboard');
  if (dashboardLink) {
    dashboardLink.addEventListener('click', () => {
      // Only load if dashboard section is shown
      AuthHelper.checkUserRole('counselor').then(result => {
        if (result && result.user) {
          loadDashboardAnalytics(result.user.uid);
        }
      });
    });
  }
  // Profile section already patched below
  const profileLink = document.getElementById('nav-profile');
  if (profileLink) {
    profileLink.addEventListener('click', () => {
      loadProfileSection();
    });
  }
};
// Also load analytics if dashboard is active on page load
if (document.getElementById('section-dashboard')?.classList.contains('active')) {
  AuthHelper.checkUserRole('counselor').then(result => {
    if (result && result.user) {
      loadDashboardAnalytics(result.user.uid);
    }
  });
}

// --- Notifications Logic ---
let notificationsUnsubscribe = null;
function setupNotifications(counselorUid) {
  const bell = document.getElementById('notificationsBell');
  const badge = document.getElementById('notificationsBadge');
  const dropdown = document.getElementById('notificationsDropdown');
  const closeBtn = document.getElementById('closeNotificationsDropdown');
  const listDiv = document.getElementById('notificationsList');

  // Show/hide dropdown
  bell.onclick = function(e) {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    if (dropdown.style.display === 'block') {
      // Mark all as read
      markAllNotificationsRead(counselorUid);
      badge.style.display = 'none';
    }
  };
  closeBtn.onclick = function() { dropdown.style.display = 'none'; };
  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target) && e.target !== bell) {
      dropdown.style.display = 'none';
    }
  });

  // Listen for notifications
  if (notificationsUnsubscribe) notificationsUnsubscribe();
  notificationsUnsubscribe = db.collection('notifications')
    .where('toUid', '==', counselorUid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .onSnapshot(snapshot => {
      let unread = 0;
      let html = '';
      if (snapshot.empty) {
        html = '<div class="no-data-message">No notifications.</div>';
      } else {
        html = '<ul style="list-style:none;padding:0;">';
        snapshot.forEach(doc => {
          const n = doc.data();
          const isUnread = !n.read;
          if (isUnread) unread++;
          let icon = '<i class="fas fa-bell"></i>';
          if (n.type === 'appointment') icon = '<i class="fas fa-calendar-alt" style="color:#5b7cfa"></i>';
          if (n.type === 'status') icon = '<i class="fas fa-info-circle" style="color:#27ae60"></i>';
          if (n.type === 'resource') icon = '<i class="fas fa-book" style="color:#f39c12"></i>';
          html += `<li style="margin-bottom:0.85rem;display:flex;align-items:flex-start;gap:0.75rem;${isUnread ? 'background:#f4f6fb;' : ''}padding:0.5rem 0;border-bottom:1px solid #eee;">
            ${icon}
            <span style="flex:1;">
              <span style="font-weight:${isUnread ? 'bold' : 'normal'};">${n.message}</span><br>
              <span style="font-size:0.92em;color:#888;">${n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString() : ''}</span>
            </span>
            ${n.link ? `<a href="${n.link}" style="color:#5b7cfa;font-size:1.1em;margin-left:0.5rem;" target="_blank"><i class='fas fa-arrow-right'></i></a>` : ''}
          </li>`;
        });
        html += '</ul>';
      }
      listDiv.innerHTML = html;
      // Show/hide badge
      if (unread > 0) {
        badge.textContent = unread;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
        }
    });
}
async function markAllNotificationsRead(counselorUid) {
  // Mark all unread notifications as read
  const snap = await db.collection('notifications')
    .where('toUid', '==', counselorUid)
    .where('read', '==', false)
    .get();
  const batch = db.batch();
  snap.forEach(doc => {
    batch.update(doc.ref, { read: true });
  });
  if (!snap.empty) await batch.commit();
}
// Patch navigation to set up notifications after auth
const origSetupNavigationNotif = setupNavigation;
setupNavigation = function() {
  origSetupNavigationNotif();
  AuthHelper.checkUserRole('counselor').then(result => {
    if (result && result.user) {
      setupNotifications(result.user.uid);
    }
  });
};
// Also set up notifications on page load
AuthHelper.checkUserRole('counselor').then(result => {
  if (result && result.user) {
    setupNotifications(result.user.uid);
  }
});

// --- Notification Helper ---
async function createNotification({ toUid, message, type = 'status', link = '', extra = {} }) {
  try {
    await db.collection('notifications').add({
      toUid,
      message,
      type,
      link: link || '',
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...extra
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

// --- Dashboard Stats Update ---
function updateDashboardStats(user) {
  // 1. Total Students
  db.collection('users').where('role', '==', 'student').get().then(snapshot => {
    const el = document.getElementById('totalStudentsCount');
    if (el) el.textContent = snapshot.size;
  });
  // 2. Today's Appointments
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  db.collection('appointments')
    .where('counselorId', '==', user.uid)
    .where('date', '==', todayStr)
    .get()
    .then(snapshot => {
      const el = document.getElementById('todayAppointmentsCount');
      if (el) el.textContent = snapshot.size;
    });
  // 3. Pending Appointments
  db.collection('appointments')
    .where('counselorId', '==', user.uid)
    .where('status', '==', 'pending')
    .get()
    .then(snapshot => {
      const el = document.getElementById('pendingAppointmentsCount');
      if (el) el.textContent = snapshot.size;
    });
}

// --- Appointments Calendar Tab Logic ---
let counselorCalendarInitialized = false;
let counselorCalendarInstance = null;

function setupAppointmentsTabs(counselorId) {
  const tabs = document.querySelectorAll('.appointment-tab');
  const listTab = document.getElementById('appointmentsListTab');
  const calendarTab = document.getElementById('appointmentsCalendarTab');
  if (!tabs.length || !listTab || !calendarTab) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      if (this.getAttribute('data-tab') === 'list') {
        listTab.classList.add('active');
        listTab.style.display = '';
        calendarTab.classList.remove('active');
        calendarTab.style.display = 'none';
      } else {
        listTab.classList.remove('active');
        listTab.style.display = 'none';
        calendarTab.classList.add('active');
        calendarTab.style.display = '';
        if (!counselorCalendarInitialized) {
          loadCounselorAppointmentsCalendar(counselorId);
        }
      }
    });
  });
}

async function loadCounselorAppointmentsCalendar(counselorId) {
  const calendarEl = document.getElementById('counselor-appointments-calendar');
  if (!calendarEl) return;
  calendarEl.innerHTML = '';
  // Fetch all appointments for this counselor
  const snapshot = await db.collection('appointments')
    .where('counselorId', '==', counselorId)
    .orderBy('appointmentDate')
    .get();
  const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Map to FullCalendar events
  const statusColors = {
    approved: '#27ae60',
    pending: '#f39c12',
    scheduled: '#5b7cfa',
    confirmed: '#5b7cfa',
    rejected: '#e74c3c',
    cancelled: '#888'
  };
  const events = appointments.map(appt => {
    let start = null;
    if (appt.appointmentDate && appt.appointmentDate.toDate) {
      start = appt.appointmentDate.toDate();
    } else if (appt.date && appt.time) {
      start = new Date(`${appt.date}T${appt.time}`);
    } else if (appt.date) {
      start = new Date(appt.date);
    }
    const status = (appt.status || 'pending').toLowerCase();
    return {
      id: appt.id,
      title: appt.studentName ? `${appt.studentName} (${appt.reason || 'Appointment'})` : (appt.reason || 'Appointment'),
      start,
      backgroundColor: statusColors[status] || '#5b7cfa',
      borderColor: statusColors[status] || '#5b7cfa',
      extendedProps: { appt }
    };
  });
  // Initialize FullCalendar
  counselorCalendarInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 600,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events,
    eventClick: function(info) {
      const appt = info.event.extendedProps.appt;
      if (appt) showAppointmentDetailsModal(appt);
    },
    eventDisplay: 'block',
    nowIndicator: true,
    selectable: false,
    editable: false,
    dayMaxEvents: true
  });
  counselorCalendarInstance.render();
  counselorCalendarInitialized = true;
}

// Patch navigation to set up appointments tabs after auth
const origSetupNavigationTabs = setupNavigation;
setupNavigation = function() {
  origSetupNavigationTabs();
  const navAppointments = document.getElementById('nav-appointments');
  if (navAppointments) {
    navAppointments.addEventListener('click', () => {
      AuthHelper.checkUserRole('counselor').then(result => {
        if (result && result.user) {
          setupAppointmentsTabs(result.user.uid);
        }
      });
    });
  }
};
// Also set up tabs if appointments section is active on page load
if (document.getElementById('section-appointments')?.classList.contains('active')) {
  AuthHelper.checkUserRole('counselor').then(result => {
    if (result && result.user) {
      setupAppointmentsTabs(result.user.uid);
    }
  });
}

// --- Announcements Tab Logic ---
function setupAnnouncementsTab(user) {
  const navAnnouncements = document.getElementById('nav-announcements');
  const sectionAnnouncements = document.getElementById('section-announcements');
  if (!navAnnouncements || !sectionAnnouncements) return;
  navAnnouncements.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
    navAnnouncements.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    sectionAnnouncements.classList.add('active');
    loadAnnouncementsList(user);
  });
  // Add Announcement button
  const addBtn = document.getElementById('addAnnouncementBtn');
  if (addBtn) {
    addBtn.onclick = () => openAnnouncementModal(user);
  }
}

async function loadAnnouncementsList(user) {
  const container = document.getElementById('announcementsListContainer');
  if (!container) return;
  container.innerHTML = '<div class="no-data-message">Loading announcements...</div>';
  const snap = await db.collection('announcements').orderBy('createdAt', 'desc').get();
  if (snap.empty) {
    container.innerHTML = '<div class="no-data-message">No announcements found.</div>';
    return;
  }
  let html = '<div style="display:flex;flex-direction:column;gap:1.5rem;">';
  snap.forEach(doc => {
    const a = doc.data();
    const id = doc.id;
    const dateStr = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleString() : '';
    html += `<div class="announcement-card">
      <div style="font-size:1.15rem;font-weight:600;">${a.title || 'Announcement'}</div>
      <div style="margin:0.5rem 0 0.7rem 0;">${a.message || ''}</div>
      <div style="font-size:0.97em;color:var(--muted-text);">By <b>${a.author || 'Admin'}</b> • ${dateStr} • <span style="background:var(--muted-text);color:var(--card-bg);padding:2px 10px;border-radius:12px;font-size:0.93em;">${a.audience || 'all'}</span></div>
      <div style="position:absolute;top:1.2rem;right:1.2rem;display:flex;gap:0.5rem;">
        ${(user.role === 'admin' || (a.authorUid === user.uid)) ? `<button class="small-btn secondary-btn" onclick="window.editAnnouncement('${id}')"><i class='fas fa-edit'></i></button>` : ''}
        ${(user.role === 'admin' || (a.authorUid === user.uid)) ? `<button class="small-btn danger-btn" onclick="window.deleteAnnouncement('${id}')"><i class='fas fa-trash'></i></button>` : ''}
      </div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

// --- Announcement Modal Logic ---
function openAnnouncementModal(user, announcement = null) {
  const modal = document.getElementById('announcementModal');
  const form = document.getElementById('announcementForm');
  const titleInput = document.getElementById('announcementTitle');
  const msgInput = document.getElementById('announcementMessage');
  const audInput = document.getElementById('announcementAudience');
  const errorDiv = document.getElementById('announcementError');
  const modalTitle = document.getElementById('announcementModalTitle');
  const saveBtn = document.getElementById('saveAnnouncementBtn');
  if (!modal || !form || !titleInput || !msgInput || !audInput || !errorDiv || !modalTitle || !saveBtn) return;
  // Reset form
  form.reset();
  errorDiv.style.display = 'none';
  let editingId = null;
  if (announcement) {
    modalTitle.textContent = 'Edit Announcement';
    titleInput.value = announcement.title || '';
    msgInput.value = announcement.message || '';
    audInput.value = announcement.audience || 'all';
    editingId = announcement.id;
  } else {
    modalTitle.textContent = 'Add Announcement';
  }
  // Show modal as overlay
  modal.style.display = 'flex';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.zIndex = '9999';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  // Remove closing class if present
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.classList.remove('modal-closing');
  }
  // Close modal with animation
  document.getElementById('closeAnnouncementModal').onclick = (e) => {
    e.stopPropagation();
    closeModalWithAnimation(modal);
  };
  // Only close if clicking the overlay, not the modal content
  modal.onclick = function(event) {
    if (event.target === modal) closeModalWithAnimation(modal);
  };
  // Prevent modal content click from closing
  if (modalContent) {
    modalContent.onclick = function(e) { e.stopPropagation(); };
  }
  // Submit
  form.onsubmit = async function(e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    const title = titleInput.value.trim();
    const message = msgInput.value.trim();
    const audience = audInput.value;
    if (!title || !message || !audience) {
      errorDiv.textContent = 'All fields are required.';
      errorDiv.style.display = 'block';
      return;
    }
    saveBtn.disabled = true;
    try {
      if (editingId) {
        // Edit
        await db.collection('announcements').doc(editingId).update({
          title, message, audience
        });
      } else {
        // Add
        await db.collection('announcements').add({
          title, message, audience,
          author: user.displayName || user.name || user.email || 'Counselor',
          authorUid: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      closeModalWithAnimation(modal);
      loadAnnouncementsList(user);
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    }
    saveBtn.disabled = false;
  };
}
// Helper for modal fade-out animation
function closeModalWithAnimation(modal) {
  if (!modal) return;
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.classList.add('modal-closing');
    modalContent.addEventListener('animationend', function handler() {
      modalContent.classList.remove('modal-closing');
      modal.style.display = 'none';
      modalContent.removeEventListener('animationend', handler);
    });
  } else {
    modal.style.display = 'none';
  }
}
// Edit/delete helpers (window-scoped for inline onclick)
window.editAnnouncement = async function(id) {
  const doc = await db.collection('announcements').doc(id).get();
  if (!doc.exists) return;
  const a = doc.data();
  openAnnouncementModal(auth.currentUser, { ...a, id });
};
window.deleteAnnouncement = async function(id) {
  if (!confirm('Delete this announcement?')) return;
  try {
    await db.collection('announcements').doc(id).delete();
    const user = auth.currentUser;
    if (user) loadAnnouncementsList(user);
  } catch (err) {
    alert('Error deleting announcement: ' + err.message);
  }
};
// Patch navigation to set up Announcements tab after auth
const origSetupNavigationAnn = setupNavigation;
setupNavigation = function() {
  origSetupNavigationAnn();
  AuthHelper.checkUserRole('counselor').then(result => {
    if (result && result.user) {
      setupAnnouncementsTab(result.user);
    }
  });
};
// Also set up Announcements tab if section is active on page load
if (document.getElementById('section-announcements')?.classList.contains('active')) {
  AuthHelper.checkUserRole('counselor').then(result => {
    if (result && result.user) {
      setupAnnouncementsTab(result.user);
      loadAnnouncementsList(result.user);
    }
  });
}

// --- Sidebar Collapse Functionality ---
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.collapsible-sidebar');
  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  const collapseIcon = document.getElementById('sidebarCollapseIcon');
  // Restore state from localStorage
  if (sidebar && localStorage.getItem('counselorSidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed');
    if (collapseIcon) collapseIcon.style.transform = 'rotate(180deg)';
  }
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      if (collapseIcon) collapseIcon.style.transform = isCollapsed ? 'rotate(180deg)' : '';
      localStorage.setItem('counselorSidebarCollapsed', isCollapsed);
    });
  }
});

// --- Toast Notification Helper ---
function showToast(message, type = 'info') {
  // Remove any existing toast
  const old = document.getElementById('dashboard-toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.id = 'dashboard-toast';
  toast.style.cssText = `
    position: fixed;
    top: 32px;
    right: 32px;
    min-width: 260px;
    max-width: 350px;
    background: #232946;
    color: #f4f6fb;
    border-left: 6px solid ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#5b7cfa'};
    box-shadow: 0 4px 16px rgba(44,62,80,0.15);
    border-radius: 10px;
    padding: 1.1rem 2.2rem 1.1rem 1.1rem;
    z-index: 9999;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 1rem;
    opacity: 0;
    transition: opacity 0.4s;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  `;
  toast.innerHTML = `
    <span style="font-size:1.5rem;color:${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#5b7cfa'};margin-top:2px;">
      <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
    </span>
    <span>${message}</span>
    <button style="background:none;border:none;color:#888;font-size:1.2rem;position:absolute;top:8px;right:12px;cursor:pointer;" onclick="this.parentNode.remove()">&times;</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = 1; }, 10);
  setTimeout(() => {
    if (toast.parentNode) toast.style.opacity = 0;
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
  }, 4000);
}

// --- Patch Dashboard Navigation Toasts ---
document.addEventListener('DOMContentLoaded', () => {
  // Patch dashboard nav links to show a toast for demonstration
  const dashboardNav = document.getElementById('nav-dashboard');
  if (dashboardNav) {
    dashboardNav.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Welcome to your dashboard!', 'info');
      // Optionally, switch to dashboard section here
    });
  }
});

// Ensure only the active section is visible and has opacity 1 on page load
window.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.section');
  let foundActive = false;
  sections.forEach(sec => {
    if (sec.classList.contains('active')) {
      sec.style.display = 'block';
      sec.style.opacity = 1;
      foundActive = true;
    } else {
      sec.style.display = 'none';
      sec.style.opacity = 0;
    }
  });
  // If none is active, show the first section
  if (!foundActive && sections[0]) {
    sections[0].classList.add('active');
    sections[0].style.display = 'block';
    sections[0].style.opacity = 1;
  }
});

// On page load, if Announcements section is active, load announcements
window.addEventListener('DOMContentLoaded', async () => {
  const sectionAnnouncements = document.getElementById('section-announcements');
  if (sectionAnnouncements && sectionAnnouncements.classList.contains('active')) {
    const authResult = await AuthHelper.checkUserRole('counselor');
    if (authResult && authResult.user) {
      loadAnnouncementsList(authResult.user);
      // Wire up Add Announcement button
      const addBtn = document.getElementById('addAnnouncementBtn');
      if (addBtn) {
        addBtn.onclick = () => openAnnouncementModal(authResult.user);
      }
    }
  }
});

// On page load, update sidebar avatar and name
window.addEventListener('DOMContentLoaded', () => {
  const user = auth.currentUser;
  if (user) updateSidebarUserInfo(user);
});

// On page load, update sidebar avatar and name with latest Firestore data
window.addEventListener('DOMContentLoaded', () => {
  AuthHelper.checkUserRole('counselor').then(result => {
    if (result && result.user && result.userData) {
      updateSidebarUserInfo({
        displayName: result.user.displayName || result.userData.name,
        name: result.userData.name,
        email: result.user.email,
        photoURL: result.user.photoURL || result.userData.photoURL
      });
    }
  });
});

// --- Announcements Section Enhancements ---

// Category icon map
const ANNOUNCEMENT_CATEGORY_ICONS = {
  general: 'fa-bullhorn',
  urgent: 'fa-exclamation-circle',
  event: 'fa-calendar-day',
  reminder: 'fa-clipboard-list',
};

// Render announcements
async function renderAnnouncements() {
  const listDiv = document.getElementById('announcements-list');
  const pinnedDiv = document.getElementById('pinned-announcements');
  const noMsg = document.getElementById('no-announcements-message');
  if (!listDiv || !pinnedDiv) return;
  listDiv.innerHTML = '';
  pinnedDiv.innerHTML = '';
  noMsg.style.display = 'none';

  // Fetch announcements from Firestore
  let snap = await db.collection('announcements').orderBy('createdAt', 'desc').get();
  let announcements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Apply search/filter
  const searchVal = (document.getElementById('announcement-search')?.value || '').toLowerCase();
  const catVal = document.getElementById('announcement-category-filter')?.value || '';
  announcements = announcements.filter(a => {
    const matchesSearch =
      a.title?.toLowerCase().includes(searchVal) ||
      a.message?.toLowerCase().includes(searchVal);
    const matchesCat = !catVal || (a.category || 'general') === catVal;
    return matchesSearch && matchesCat;
  });

  if (announcements.length === 0) {
    noMsg.style.display = 'block';
    return;
  }

  // Separate pinned and normal
  const pinned = announcements.filter(a => a.pinned);
  const normal = announcements.filter(a => !a.pinned);

  // Render pinned
  pinned.forEach(a => pinnedDiv.appendChild(createAnnouncementCard(a, true)));
  // Render normal
  normal.forEach(a => listDiv.appendChild(createAnnouncementCard(a, false)));
}

// Create announcement card element
function createAnnouncementCard(a, isPinned) {
  const card = document.createElement('div');
  card.className = 'announcement-card' + (isPinned ? ' pinned' : '');
  // Icon
  const iconClass = ANNOUNCEMENT_CATEGORY_ICONS[a.category] || 'fa-bullhorn';
  // Badge
  const badgeClass = 'announcement-badge ' + (a.category || 'general');
  // Avatar
  const avatarUrl = a.authorPhotoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(a.author || 'Counselor') + '&background=5b7cfa&color=fff&size=128';
  // Date
  const dateStr = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleDateString() : '';
  // Card HTML
  card.innerHTML = `
    <div class="announcement-header">
      <span class="announcement-icon"><i class="fas ${iconClass}"></i></span>
      <span class="announcement-title">${a.title || 'Announcement'}</span>
      <span class="${badgeClass}"><i class="fas ${iconClass}"></i> ${(a.category || 'General').charAt(0).toUpperCase() + (a.category || 'General').slice(1)}</span>
      ${isPinned ? '<span class="announcement-pin" title="Pinned"><i class="fas fa-thumbtack"></i></span>' : ''}
    </div>
    <div class="announcement-meta">
      <img src="${avatarUrl}" class="announcement-avatar" alt="${a.author || 'Counselor'}">
      <span>${a.author || 'Counselor'}</span>
      <span>&bull;</span>
      <span>${dateStr}</span>
    </div>
    <div class="announcement-message">${a.message?.length > 120 ? a.message.slice(0, 120) + '…' : a.message || ''}</div>
  `;
  card.onclick = () => showAnnouncementModal(a);
  return card;
}

// Show announcement modal
function showAnnouncementModal(a) {
  const modal = document.getElementById('announcement-modal');
  const body = document.getElementById('announcement-modal-body');
  if (!modal || !body) return;
  // Icon
  const iconClass = ANNOUNCEMENT_CATEGORY_ICONS[a.category] || 'fa-bullhorn';
  // Badge
  const badgeClass = 'announcement-badge ' + (a.category || 'general');
  // Avatar
  const avatarUrl = a.authorPhotoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(a.author || 'Counselor') + '&background=5b7cfa&color=fff&size=128';
  // Date
  const dateStr = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleString() : '';
  body.innerHTML = `
    <div class="announcement-header">
      <span class="announcement-icon"><i class="fas ${iconClass}"></i></span>
      <span class="announcement-title">${a.title || 'Announcement'}</span>
      <span class="${badgeClass}"><i class="fas ${iconClass}"></i> ${(a.category || 'General').charAt(0).toUpperCase() + (a.category || 'General').slice(1)}</span>
      ${a.pinned ? '<span class="announcement-pin" title="Pinned"><i class="fas fa-thumbtack"></i></span>' : ''}
    </div>
    <div class="announcement-meta">
      <img src="${avatarUrl}" class="announcement-avatar" alt="${a.author || 'Counselor'}">
      <span>${a.author || 'Counselor'}</span>
      <span>&bull;</span>
      <span>${dateStr}</span>
    </div>
    <div class="announcement-message">${a.message || ''}</div>
  `;
  modal.style.display = 'flex';
  modal.classList.add('show');
  document.getElementById('close-announcement-modal').onclick = () => {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
  };
  modal.onclick = e => { if (e.target === modal) { modal.classList.remove('show'); setTimeout(() => { modal.style.display = 'none'; }, 250); } };
}

// Search/filter listeners
const searchInput = document.getElementById('announcement-search');
const catFilter = document.getElementById('announcement-category-filter');
if (searchInput) searchInput.addEventListener('input', renderAnnouncements);
if (catFilter) catFilter.addEventListener('change', renderAnnouncements);

// --- Pin/Unpin Support (for counselors) ---
// (Assume only counselors can pin/unpin their own announcements)
// Add pin/unpin button in modal if user is author
function showAnnouncementModal(a) {
  const modal = document.getElementById('announcement-modal');
  const body = document.getElementById('announcement-modal-body');
  if (!modal || !body) return;
  // Icon
  const iconClass = ANNOUNCEMENT_CATEGORY_ICONS[a.category] || 'fa-bullhorn';
  // Badge
  const badgeClass = 'announcement-badge ' + (a.category || 'general');
  // Avatar
  const avatarUrl = a.authorPhotoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(a.author || 'Counselor') + '&background=5b7cfa&color=fff&size=128';
  // Date
  const dateStr = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleString() : '';
  body.innerHTML = `
    <div class="announcement-header">
      <span class="announcement-icon"><i class="fas ${iconClass}"></i></span>
      <span class="announcement-title">${a.title || 'Announcement'}</span>
      <span class="${badgeClass}"><i class="fas ${iconClass}"></i> ${(a.category || 'General').charAt(0).toUpperCase() + (a.category || 'General').slice(1)}</span>
      ${a.pinned ? '<span class="announcement-pin" title="Pinned"><i class="fas fa-thumbtack"></i></span>' : ''}
    </div>
    <div class="announcement-meta">
      <img src="${avatarUrl}" class="announcement-avatar" alt="${a.author || 'Counselor'}">
      <span>${a.author || 'Counselor'}</span>
      <span>&bull;</span>
      <span>${dateStr}</span>
    </div>
    <div class="announcement-message">${a.message || ''}</div>
    <div class="announcement-actions">
      <button class="secondary-btn" id="pin-announcement-btn"><i class="fas fa-thumbtack"></i> ${a.pinned ? 'Unpin' : 'Pin'}</button>
    </div>
  `;
  // Pin/unpin logic
  document.getElementById('pin-announcement-btn').onclick = async () => {
    await db.collection('announcements').doc(a.id).update({ pinned: !a.pinned });
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
    renderAnnouncements();
  };
  modal.style.display = 'flex';
  modal.classList.add('show');
  document.getElementById('close-announcement-modal').onclick = () => {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
  };
  modal.onclick = e => { if (e.target === modal) { modal.classList.remove('show'); setTimeout(() => { modal.style.display = 'none'; }, 250); } };
}

// --- Create Announcement Modal ---
document.getElementById('create-announcement-btn')?.addEventListener('click', () => {
  showCreateAnnouncementModal();
});

function showCreateAnnouncementModal() {
  const modal = document.getElementById('announcement-modal');
  const body = document.getElementById('announcement-modal-body');
  if (!modal || !body) return;
  body.innerHTML = `
    <h2 class="announcement-title" style="margin-bottom:1.2rem;">Create Announcement</h2>
    <form id="create-announcement-form">
      <div class="form-group">
        <label for="new-announcement-title">Title</label>
        <input type="text" id="new-announcement-title" required placeholder="Enter announcement title">
      </div>
      <div class="form-group">
        <label for="new-announcement-message">Message</label>
        <textarea id="new-announcement-message" rows="4" required placeholder="Write your message..."></textarea>
      </div>
      <div class="form-group">
        <label for="new-announcement-category">Category</label>
        <select id="new-announcement-category" required>
          <option value="general">General</option>
          <option value="urgent">Urgent</option>
          <option value="event">Event</option>
          <option value="reminder">Reminder</option>
        </select>
      </div>
      <div class="form-group">
        <label for="new-announcement-audience">Audience</label>
        <select id="new-announcement-audience" required>
          <option value="all">All</option>
          <option value="student">Students</option>
          <option value="counselor">Counselors</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <div class="error-message" id="create-announcement-error" style="display:none;"></div>
      <button type="submit" class="primary-btn" style="width:100%;font-size:1.08rem;margin-top:1.2rem;">Create</button>
    </form>
  `;
  modal.style.display = 'flex';
  modal.classList.add('show');
  document.getElementById('close-announcement-modal').onclick = () => {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
  };
  modal.onclick = e => { if (e.target === modal) { modal.classList.remove('show'); setTimeout(() => { modal.style.display = 'none'; }, 250); } };
  // Form submit
  document.getElementById('create-announcement-form').onsubmit = async function(e) {
    e.preventDefault();
    const title = document.getElementById('new-announcement-title').value.trim();
    const message = document.getElementById('new-announcement-message').value.trim();
    const category = document.getElementById('new-announcement-category').value;
    const audience = document.getElementById('new-announcement-audience').value;
    const errorDiv = document.getElementById('create-announcement-error');
    if (!title || !message) {
      errorDiv.textContent = 'Title and message are required.';
      errorDiv.style.display = 'block';
      return;
    }
    errorDiv.style.display = 'none';
    // Get current user info
    const user = firebase.auth().currentUser;
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    // Add to Firestore
    await db.collection('announcements').add({
      title,
      message,
      category,
      audience,
      author: userData.name || user.displayName || 'Counselor',
      authorPhotoURL: userData.photoURL || user.photoURL || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      pinned: false
    });
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
    renderAnnouncements();
  };
}

// Initial render
renderAnnouncements();

// --- Sidebar Navigation Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.sidebar-link[data-section]');
  const sections = document.querySelectorAll('.section');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      // Remove active from all links
      navLinks.forEach(l => l.classList.remove('active'));
      // Add active to clicked link
      this.classList.add('active');
      // Hide all sections
      sections.forEach(sec => sec.classList.remove('active'));
      // Show the target section
      const targetSection = this.getAttribute('data-section');
      const sectionEl = document.getElementById(`${targetSection}-section`);
      if (sectionEl) sectionEl.classList.add('active');
    });
  });
  // Optionally, show dashboard by default
  const defaultSection = document.getElementById('dashboard-section');
  if (defaultSection) defaultSection.classList.add('active');
  // Optionally, set dashboard link as active by default
  const dashboardLink = document.querySelector('.sidebar-link[data-section="dashboard"]');
  if (dashboardLink) dashboardLink.classList.add('active');
});

// --- Modern Resource Section Rendering ---
function renderResourcesSection(resources) {
  const container = document.getElementById('resourcesContainer');
  if (!container) return;
  if (!resources || resources.length === 0) {
    container.innerHTML = '<div class="no-data-message">No resources available.</div>';
    return;
  }
  // Create grid
  const grid = document.createElement('div');
  grid.className = 'resources-grid';
  resources.forEach(resource => {
    // File type icon
    let icon = '<i class="fas fa-file-alt"></i>';
    if (resource.fileType) {
      const type = resource.fileType.toLowerCase();
      if (type.includes('pdf')) icon = '<i class="fas fa-file-pdf" style="color:#e74c3c"></i>';
      else if (type.includes('doc')) icon = '<i class="fas fa-file-word" style="color:#2980b9"></i>';
      else if (type.includes('ppt')) icon = '<i class="fas fa-file-powerpoint" style="color:#e67e22"></i>';
      else if (type.includes('xls')) icon = '<i class="fas fa-file-excel" style="color:#27ae60"></i>';
      else if (type.includes('jpg') || type.includes('jpeg') || type.includes('png')) icon = '<i class="fas fa-file-image" style="color:#5b7cfa"></i>';
    }
    const dateObj = resource.createdAt && resource.createdAt.toDate ? resource.createdAt.toDate() : new Date();
    const dateString = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.innerHTML = `
      <div class="resource-card-header">
        <span class="file-icon">${icon}</span>
        <h3 class="resource-title">${resource.title || 'Untitled'}</h3>
        <span class="resource-category">${resource.category || 'Uncategorized'}</span>
      </div>
      <div class="resource-card-body">
        <p class="resource-description">${resource.description || ''}</p>
        <div class="resource-footer">
          <span class="resource-date">Added: ${dateString}</span>
          <a href="#" class="resource-link view-resource-btn" data-id="${resource.id}">View Details</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
    // Add event listener for view button
    const viewBtn = card.querySelector('.view-resource-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', e => {
        e.preventDefault();
        showResourcePreviewModal(resource);
      });
    }
  });
  container.innerHTML = '';
  container.appendChild(grid);
}

// Patch: Use modern rendering in resources section
function loadResourcesSection() {
  db.collection('resources')
    .orderBy('createdAt', 'desc')
    .get()
    .then(snap => {
      const resources = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderResourcesSection(resources);
    })
    .catch(err => {
      const container = document.getElementById('resourcesContainer');
      if (container) container.innerHTML = `<div class='no-data-message'>Error loading resources: ${err.message}</div>`;
    });
}

// Optionally, call loadResourcesSection() when the resources section is shown
// (If not already handled by navigation logic)
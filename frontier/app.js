const programs = [
  { id: 'astrophysics', category: 'courses', title: 'A Universe of Possibilities', subject: 'Space & astrophysics', description: 'Travel from our solar system to distant galaxies, and discover the physics that holds it all together.', duration: '8 weeks', format: 'Self-paced course', topics: ['Stars, galaxies, and the expanding universe', 'Gravity, light, and the tools of discovery', 'A guided project mapping the night sky'] },
  { id: 'living-planet', category: 'courses', title: 'Our Living Planet', subject: 'Earth & climate', description: 'Explore the interconnected systems of our planet, from forest canopies to the changing atmosphere.', duration: '6 weeks', format: 'Self-paced course', topics: ['The science of connected ecosystems', 'Reading climate data and satellite imagery', 'Designing a local environmental field study'] },
  { id: 'orbital-lab', category: 'internships', title: 'The Orbital Research Lab', subject: 'Space & engineering', description: 'Join a virtual research team to explore satellite trajectories and plan a collaborative space mission.', duration: '12 weeks', format: 'Virtual research cohort', topics: ['Mission planning and orbital mechanics', 'Collaborative simulations and research reviews', 'A team presentation of your mission design'] },
  { id: 'climate-lab', category: 'internships', title: 'Earth Observation Collective', subject: 'Climate & data science', description: 'Connect satellite observations to life on the ground with a team of curious environmental researchers.', duration: '10 weeks', format: 'Virtual research cohort', topics: ['Working with Earth observation datasets', 'Mapping change in landscapes and habitats', 'Communicating findings through a team research brief'] },
  { id: 'creative-code', category: 'workshops', title: 'Code Your Own Cosmos', subject: 'Technology & engineering', description: 'Turn mathematical ideas into a living simulation. Build, test, and explore your own miniature universe.', duration: '3 sessions', format: 'Hands-on virtual workshop', topics: ['The building blocks of creative coding', 'Simulating gravity and orbital motion', 'Sharing an interactive model of your universe'] },
  { id: 'human-frontier', category: 'workshops', title: 'The Human Side of Discovery', subject: 'Humanities & discovery', description: 'Look at exploration through the lens of history, philosophy, and the stories that move us forward.', duration: '4 sessions', format: 'Live discussion workshop', topics: ['How exploration has shaped our shared history', 'Ethics and responsibility at the next frontier', 'Building a thoughtful narrative of discovery'] },
];

const information = {
  about: { title: 'A universe of learning.', body: '<p>COSMOS is an exploration of what an adventurous academic community can look like: a place to connect ideas, build practical skills, and follow your curiosity.</p><p>Discover courses across the sciences and humanities, explore collaborative research, or try a hands-on workshop. Your next frontier starts with a question.</p>', action: 'explore' },
  team: { title: 'Curiosity is a team sport.', body: '<p>The COSMOS concept brings learners, educators, and researchers together around shared questions.</p><p>Explore a virtual research cohort to see how a collaborative learning journey could unfold.</p>', action: 'internships' },
  careers: { title: 'Help shape the next frontier.', body: '<p>There are no open positions listed in this website preview.</p><p>In the meantime, explore the kind of learning experiences that inspire the COSMOS community.</p>', action: 'explore' },
  press: { title: 'Meet COSMOS.', body: '<p>COSMOS is a concept for an adventurous academic portal spanning science, technology, and the humanities.</p><p>This website recreates the supplied visual design. Its program descriptions are illustrative; official press materials and announcements are not available in this preview.</p>' },
  fellowships: { title: 'Make room for a big idea.', body: '<p>Fellowships bring sustained focus to a question worth exploring. The COSMOS vision pairs independent curiosity with a supportive research community.</p><p>Fellowship applications are not available in this preview. You can explore the example research cohorts and save your interests for later.</p>', action: 'internships' },
  help: { title: 'A little mission support.', body: '<h3>How do I find a program?</h3><p>Open Search or Explore Programs. Search for a subject, or use the filters to browse courses, internships, and deep dives.</p><h3>Can I keep a shortlist?</h3><p>Open a program and choose Save program. Your shortlist appears in the Saved filter and is stored on this device.</p><h3>Can I apply or enroll?</h3><p>This is an interactive website preview. You can create a local explorer profile, but applications, enrollment, payments, and online accounts are not connected.</p>', action: 'explore' },
  contact: { title: 'Let’s stay curious.', body: '<p>A contact service has not been connected to this preview, so messages cannot be sent from this page.</p><p>For help exploring the site, visit the Help Center. To keep track of your interests, create an explorer profile on your device.</p>', action: 'signup' },
  accessibility: { title: 'Discovery is for everyone.', body: '<p>This site supports keyboard navigation, visible focus indicators, descriptive image alternatives, and reduced-motion preferences.</p><p>Use the Tab key to move between controls, Enter to select, and Escape to close a dialog. A skip-to-content link is available at the beginning of the page.</p><p>The page adapts to mobile screens and browser zoom. Program search announces updated result counts to assistive technology.</p>' },
  status: { title: 'Ready for exploration.', body: '<p><strong>Website preview: available</strong></p><p>Program search, filtering, and local saved profiles work in your browser. Online accounts, applications, and enrollment services are not connected.</p>' },
  privacy: { title: 'Your privacy, in plain language.', body: '<p>This preview does not transmit your profile or program selections to a server. Your name, email, interests, and saved programs are stored in this browser using local storage.</p><p>You can remove your explorer profile from My Profile and remove programs from your Saved list. Clearing this site’s browser data removes all locally stored information.</p><p>No analytics, advertising trackers, or third-party font services are included.</p>' },
  terms: { title: 'A space to explore.', body: '<p>This website is an interactive recreation of the supplied COSMOS design. The programs and academic opportunities shown are examples for demonstration.</p><p>Creating a profile or saving a program does not submit an application, create an online account, reserve a place, or enroll you in a course.</p><p>Supplied artwork remains the property of its respective owners.</p>' },
  cookies: { title: 'A lighter footprint.', body: '<p>This preview uses no cookies, advertising trackers, or analytics.</p><p>Local storage remembers the explorer profile and programs you choose to save. This information stays in your browser and can be removed through your profile or your browser’s site-data settings.</p>' },
  community: { title: 'Find your fellow explorers.', body: '<p>Big questions are better shared. Browse collaborative research cohorts to find a topic you would like to explore with others.</p><p>Social community channels are not connected in this preview.</p>', action: 'internships' },
  campus: { title: 'A campus without boundaries.', body: '<p>Imagine a place where a virtual lab, a lively seminar, and your next discovery are only a few steps apart.</p><p>Start by exploring the example courses and workshops in the program explorer.</p>', action: 'explore' },
};

const $ = (selector) => document.querySelector(selector);
const dialogs = [...document.querySelectorAll('dialog')];
const categoryLabels = { courses: 'Stellar course', internships: 'Virtual internship', workshops: 'Deep dive' };
let filter = 'all';
let accountMode = 'signup';
let toastTimer;
let selectedProgramId;

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

const savedValue = readStorage('cosmos-saved', []);
let saved = new Set(Array.isArray(savedValue) ? savedValue.filter(id => programs.some(p => p.id === id)) : []);
const profileValue = readStorage('cosmos-profile', null);
let profile = profileValue && typeof profileValue.name === 'string' && typeof profileValue.email === 'string' && typeof profileValue.interest === 'string' ? profileValue : null;

function closeMenu() {
  const focusWasInMenu = $('.primary-nav').classList.contains('is-open') && $('.primary-nav').contains(document.activeElement);
  $('.primary-nav').classList.remove('is-open');
  $('.menu-toggle').setAttribute('aria-expanded', 'false');
  $('.menu-toggle').setAttribute('aria-label', 'Open navigation');
  if (focusWasInMenu) $('.menu-toggle').focus({ preventScroll: true });
}

function openDialog(dialog, focusSelector) {
  closeMenu();
  for (const other of dialogs) if (other !== dialog && other.open) other.close();
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  const status = dialog.querySelector('.dialog-status');
  if (status) status.textContent = '';
  if (focusSelector) dialog.querySelector(focusSelector)?.focus({ preventScroll: true });
}

function showToast(message) {
  clearTimeout(toastTimer);
  const activeStatus = document.querySelector('dialog[open] .dialog-status');
  if (activeStatus) {
    activeStatus.textContent = message;
    return;
  }
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
}

function renderPrograms() {
  const query = $('#program-search').value.trim().toLowerCase();
  const results = programs.filter(program => (filter === 'all' || (filter === 'saved' ? saved.has(program.id) : program.category === filter)) && `${program.title} ${program.description} ${program.subject}`.toLowerCase().includes(query));
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  $('#saved-count').textContent = saved.size;
  $('#results-count').textContent = `${results.length} ${results.length === 1 ? 'program' : 'programs'} to explore${query ? ` for “${$('#program-search').value.trim()}”` : ''}`;
  $('#catalog-results').replaceChildren();
  if (!results.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const title = document.createElement('strong');
    title.textContent = filter === 'saved' && !query ? 'Your next discovery is waiting.' : 'No missions found just yet.';
    const message = document.createElement('p');
    message.textContent = filter === 'saved' && !query ? 'Open a program and save it to start your shortlist.' : 'Try a different subject or choose another filter.';
    empty.append(title, message);
    $('#catalog-results').append(empty);
    return;
  }
  for (const program of results) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'catalog-card';
    card.dataset.program = program.id;
    card.innerHTML = `<span class="eyebrow">${categoryLabels[program.category]} · ${program.subject}</span><h3>${program.title}</h3><p>${program.description}</p><span class="catalog-card-footer"><span>${program.duration}${saved.has(program.id) ? ' · Saved' : ''}</span><span>View program <svg><use href="#icon-arrow"/></svg></span></span>`;
    $('#catalog-results').append(card);
  }
}

function openExplorer(category = 'all') {
  filter = category;
  $('#program-search').value = '';
  renderPrograms();
  openDialog($('#explore-dialog'), '#program-search');
}

function showProgram(id) {
  const program = programs.find(item => item.id === id);
  if (!program) return;
  selectedProgramId = id;
  $('#info-eyebrow').textContent = `${categoryLabels[program.category]} · ${program.duration}`;
  $('#info-title').textContent = program.title;
  $('#info-content').innerHTML = `<p>${program.description}</p><h3>Your mission</h3><ul>${program.topics.map(topic => `<li>${topic}</li>`).join('')}</ul><p><strong>${program.format}</strong></p><p>This is an example program in the COSMOS preview. Save it to your shortlist to remember what interests you; enrollment is not connected.</p>`;
  $('#info-action').innerHTML = `<button class="button" id="save-program" data-save="${program.id}">${saved.has(id) ? 'Remove from saved' : 'Save program'} <svg><use href="#icon-${saved.has(id) ? 'check' : 'arrow'}"/></svg></button><button class="text-button" id="back-to-programs">Back to programs</button>`;
  openDialog($('#info-dialog'));
}

function showInformation(key) {
  const info = information[key];
  if (!info) return;
  $('#info-eyebrow').textContent = 'The COSMOS community';
  $('#info-title').textContent = info.title;
  $('#info-content').innerHTML = info.body;
  $('#info-action').replaceChildren();
  if (info.action) {
    const action = document.createElement('button');
    action.className = 'button';
    action.type = 'button';
    action.textContent = info.action === 'signup' ? 'Create explorer profile' : 'Explore programs';
    if (info.action === 'signup') action.dataset.account = 'signup';
    else action.dataset.explore = info.action === 'explore' ? 'all' : info.action;
    $('#info-action').append(action);
  }
  openDialog($('#info-dialog'));
}

function updateAccountLinks() {
  const login = $('.primary-nav [data-account="login"]');
  const signup = $('.primary-nav [data-account="signup"]');
  login.textContent = profile ? 'My Profile' : 'Login';
  signup.textContent = profile ? 'My Mission' : 'Sign Up';
}

function showProfile() {
  $('#account-title').textContent = `Welcome aboard, ${profile.name.split(/\s+/)[0]}.`;
  $('#account-intro').textContent = 'A whole universe of discovery is waiting for you.';
  $('#account-form').hidden = true;
  $('#profile-success').hidden = false;
  $('#profile-message').textContent = `Your interest in ${profile.interest.toLowerCase()} is saved on this device. Explore the programs and build a shortlist for your next adventure.`;
  updateAccountLinks();
}

function openAccount(mode) {
  accountMode = mode;
  $('#account-error').textContent = '';
  if (profile) {
    showProfile();
    openDialog($('#account-dialog'));
    return;
  }
  $('#account-form').hidden = false;
  $('#profile-success').hidden = true;
  $('#account-form').reset();
  const login = mode === 'login';
  $('#account-title').textContent = login ? 'Welcome back, explorer.' : 'Join the mission.';
  $('#account-intro').textContent = login ? 'Enter your email to find an explorer profile saved in this browser.' : 'Create your explorer profile and find where your curiosity takes you.';
  $('#name-field').hidden = login;
  $('#interest-field').hidden = login;
  $('#explorer-name').required = !login;
  $('.account-submit').innerHTML = `${login ? 'Find my profile' : 'Create explorer profile'} <svg><use href="#icon-arrow"/></svg>`;
  openDialog($('#account-dialog'), login ? '#explorer-email' : '#explorer-name');
}

$('.menu-toggle').addEventListener('click', () => {
  const open = $('.menu-toggle').getAttribute('aria-expanded') !== 'true';
  $('.menu-toggle').setAttribute('aria-expanded', String(open));
  $('.menu-toggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  $('.primary-nav').classList.toggle('is-open', open);
});

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.hasAttribute('data-close')) button.closest('dialog').close();
  else if (button?.dataset.explore) openExplorer(button.dataset.explore);
  else if (button?.dataset.account) openAccount(button.dataset.account);
  else if (button?.dataset.info) showInformation(button.dataset.info);
  else if (button?.dataset.filter) { filter = button.dataset.filter; renderPrograms(); }
  else if (button?.dataset.program) showProgram(button.dataset.program);
  else if (button?.dataset.save) {
    const id = button.dataset.save;
    const next = new Set(saved);
    const wasSaved = next.has(id);
    wasSaved ? next.delete(id) : next.add(id);
    if (!writeStorage('cosmos-saved', [...next])) { showToast('Your browser could not save this program. Allow site storage and try again.'); return; }
    saved = next;
    button.innerHTML = `${saved.has(id) ? 'Remove from saved' : 'Save program'} <svg><use href="#icon-${saved.has(id) ? 'check' : 'arrow'}"/></svg>`;
    showToast(wasSaved ? 'Program removed from your shortlist.' : 'Program saved. Find it in your Saved list.');
  } else if (button?.id === 'back-to-programs') {
    renderPrograms();
    openDialog($('#explore-dialog'));
    document.querySelector(`[data-program="${selectedProgramId}"]`)?.focus({ preventScroll: true });
  }
  if (event.target.closest('.primary-nav a')) closeMenu();
  if (!event.target.closest('.site-header')) closeMenu();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});

for (const dialog of dialogs) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) dialog.close();
  });
}

$('#program-search').addEventListener('input', renderPrograms);
$('#account-form').addEventListener('submit', event => {
  event.preventDefault();
  $('#account-error').textContent = '';
  const email = $('#explorer-email').value.trim().toLowerCase();
  if (accountMode === 'login') {
    const found = readStorage('cosmos-profile', null);
    if (found && typeof found.name === 'string' && typeof found.interest === 'string' && found.email === email) {
      profile = found;
      showProfile();
    } else {
      $('#account-error').replaceChildren(document.createTextNode('No profile with that email is saved in this browser. '));
      const signup = document.createElement('button');
      signup.type = 'button';
      signup.className = 'text-button';
      signup.dataset.account = 'signup';
      signup.textContent = 'Create your explorer profile';
      $('#account-error').append(signup);
    }
    return;
  }
  const name = $('#explorer-name').value.trim();
  if (!name) { $('#account-error').textContent = 'Enter your name to create your explorer profile.'; $('#explorer-name').focus(); return; }
  const next = { name, email, interest: $('#explorer-interest').value };
  if (!writeStorage('cosmos-profile', next)) { $('#account-error').textContent = 'Your browser could not save your profile. Allow site storage and try again.'; return; }
  profile = next;
  showProfile();
  $('#profile-success .button').focus();
});

$('#reset-profile').addEventListener('click', () => {
  try { localStorage.removeItem('cosmos-profile'); } catch { showToast('Your browser could not remove the profile. Try clearing this site’s browser data.'); return; }
  profile = null;
  updateAccountLinks();
  openAccount('signup');
  showToast('Your saved explorer profile has been removed.');
});

updateAccountLinks();

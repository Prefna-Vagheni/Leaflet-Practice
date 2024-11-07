'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const workoutTag = document.querySelector('.workout');
const btnsContainer = document.querySelector('.btn__container');
const eraseBtn = document.querySelector('.erase__btn');

// let mapEvent, map;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //In min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }

  _calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._calcSpeed();
    this._setDescription();
  }

  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, 12], 5.2, 24, 189);
// const cycling1 = new Cycling([39, 12], 34, 78, 12);

// console.log(run1, cycling1);

//////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoom = 13;
  #mapEvent;
  #workouts = [];
  #data;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    // workoutTag.addEventListener('click', this._editForm.bind(this));
    containerWorkouts.addEventListener('click', this._editForm.bind(this));
    eraseBtn.addEventListener('click', this.reset.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get the current position');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoom);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty input
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _editForm(e) {
    if (e.target.tagName === 'BUTTON') {
      const liItem = e.target.closest('.workout');
      // const ul = li.parentNode;
      // console.log(liItem.dataset.id);
      // console.log(e.target.dataset.id);
      // console.log(e.target.dataset.id);
      if (e.target.dataset.id === 'remove') {
        // ul.removeChild(li);
        // let dataToRemove = JSON.parse(localStorage.getItem('workout'));
        let storeItem;
        console.log(this.#data);
        this.#data = this.#data.filter(item => item.id !== liItem.dataset.id);

        localStorage.setItem('workouts', JSON.stringify(this.#data));
        location.reload();
        console.log(this.#data);
      }
      if (e.target.dataset.id === 'edit') {
        // console.log('The button you clicked is an edit button.');
        // capture values from input field
        const descendingChildren = liItem.querySelectorAll('.workout__value');
        const [one, two, three, four] = descendingChildren;
        let oneValue = +one.textContent;
        let twoValue = +two.textContent;
        let threeValue = +three.textContent;
        let fourValue = +four.textContent;

        console.log(descendingChildren);
        console.log(oneValue, twoValue, threeValue, fourValue);
        descendingChildren.forEach(el => console.log(el.textContent));

        // Hide workout /../
        liItem.style.display = 'none';
        form.classList.remove('hidden');
        inputDistance.focus();
        inputDistance.value = oneValue;

        // Add new object to workout array
        form.addEventListener('submit', this._newWorkout.bind(this));
      }
    }
    // console.log(e.target.parentNode);
    // let val;
    // for (let [key, value] of this.#workouts.entries()) {
    //   val = this.#workouts[key].distance;
    // }
    // console.log(val);

    // if (e.target.classList.contains('workout__value')) {
    //   let cadenceValue = inputCadence.value;
    //   let durationValue = inputDuration.value;
    //   let distanceValue = inputDistance.value;
    //   let elevationValue = inputElevation.value;
    //   for (let [key, value] of this.#workouts.entries())
    //     console.log(key, value);
    // }
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every(input => input > 0);
    e.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    // Get data from form
    const type = inputType.value;

    // if workout running, create running
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInput(distance, duration, cadence) ||
        !isPositive(distance, duration, cadence)
      )
        return alert('The input has to be a number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout cycling, create cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInput(distance, duration, elevation) ||
        !isPositive(distance, duration)
      )
        return alert('input has to be a number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields.
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    this._editForm(workout);
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">
            ${workout.type === 'running' ? '🏃‍♂️' : '🚴'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
            </div>
    `;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
       <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    
    `;

    if (workout.type === 'cycling')
      html += `
    <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
           <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      
        `;
    html += `<div class = 'btn__container'>
              <button class='btn btn--edit' data-id='edit'>Edit</button>
              <button class='btn btn--remove' data-id='remove'>Remove</button>
            </div> 
          </li> `;
    form.insertAdjacentHTML('afterend', html);

    // if (Object.keys(workout).length > 0) {
    // Create a button to delete all workouts
    // const deleteAll = `<div class="erase__btn">
    //   <button class="btn__delete--all">Delete All</button>
    // </div>`;

    // if (Object.keys(workout).length > 0) {
    // let el = document.createElement('div');
    // el.textContent = 'Delete all';
    // el.classList.add('btn__delete--all');
    // containerWorkouts.appendChild(el);

    // Create a button to delete all workouts
    if (!workout) return;
    eraseBtn.classList.remove('hidden');
    // const deleteAll = `<div class="erase__btn">
    //     <button class="btn__delete--all">Delete All</button>
    //   </div>`;
    // containerWorkouts.appendChild(deleteAll);
    // let el = document.createElement('div');
    // el.textContent = 'Delete all';
    // el.classList.add('btn__delete--all');
    // containerWorkouts.appendChild(el);
    // }
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    this.#data = JSON.parse(localStorage.getItem('workouts'));

    if (!this.#data) return;

    this.#workouts = this.#data;

    // this._renderWorkout();
    this.#workouts.forEach(work => this._renderWorkout(work));
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

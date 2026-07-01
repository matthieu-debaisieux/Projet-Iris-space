  /* =========================================================
         DONNÉES DE DÉMONSTRATION
         À remplacer par un appel API / base de données réelle.
         Structure : schedule[classe][jour] = tableau de cours
         Chaque cours : { start, end, subject, intervenant, room }
      ========================================================= */
      const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
      const monthNames = [
        "janvier","février","mars","avril","mai","juin",
        "juillet","août","septembre","octobre","novembre","décembre",
      ];
      const hourSlots = ["09h00","10h00","11h00","12h00","13h00","14h00","15h00","16h00","17h00","18h00"];

      // Palette de couleurs assignée automatiquement à chaque nouvelle matière
      const colorPalette = [
        "bg-blue-100 text-blue-800 border-blue-300",
        "bg-rose-100 text-rose-800 border-rose-300",
        "bg-emerald-100 text-emerald-800 border-emerald-300",
        "bg-amber-100 text-amber-800 border-amber-300",
        "bg-lime-100 text-lime-800 border-lime-300",
        "bg-cyan-100 text-cyan-800 border-cyan-300",
        "bg-orange-100 text-orange-800 border-orange-300",
        "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
        "bg-purple-100 text-purple-800 border-purple-300",
        "bg-sky-100 text-sky-800 border-sky-300",
        "bg-teal-100 text-teal-800 border-teal-300",
        "bg-indigo-100 text-indigo-800 border-indigo-300",
        "bg-pink-100 text-pink-800 border-pink-300",
        "bg-yellow-100 text-yellow-800 border-yellow-300",
        "bg-green-100 text-green-800 border-green-300",
        "bg-violet-100 text-violet-800 border-violet-300",
      ];
      const subjectColors = {
        "Cours1": colorPalette[0],
        "Cours2": colorPalette[1],
        "Cours3": colorPalette[2],
        "Cours4": colorPalette[3],
        "Cours5": colorPalette[4],
        "Cours6": colorPalette[5],
        "Cours7": colorPalette[6],
        "Cours8": colorPalette[7],
        "Cours9": colorPalette[8],
      };

      // Renvoie (et crée si besoin) une couleur pour une matière donnée
      function getColorForSubject(rawSubject) {
        const subject = (rawSubject || "").trim();
        if (!subject) return "bg-gray-100 text-gray-700 border-gray-300";
        if (!subjectColors[subject]) {
          const usedCount = Object.keys(subjectColors).length;
          subjectColors[subject] = colorPalette[usedCount % colorPalette.length];
        }
        return subjectColors[subject];
      }

      const schedule = {
        "Iris 1": {
          "Mercredi": [
            { start: "09h00", end: "13h00", subject: "Cours1", intervenant: "Intervenant 1", room: "Salle" },
            { start: "14h00", end: "18h00", subject: "Cours1", intervenant: "Intervenant 1", room: "Salle" },
          ],
          "Jeudi": [
            { start: "09h00", end: "10h30", subject: "Cours5", intervenant: "Intervenant 8", room: "Salle" },
            { start: "10h30", end: "12h00", subject: "Cours3", intervenant: "Intervenant 9", room: "Salle" },
            { start: "13h00", end: "16h00", subject: "Cours4", intervenant: "Intervenant 4", room: "Salle" },
            { start: "16h00", end: "18h00", subject: "Cours6", intervenant: "Intervenant 5", room: "Salle" },
          ],
          "Vendredi": [
            { start: "09h00", end: "11h00", subject: "Cours1", intervenant: "Intervenant 2", room: "Salle" },
            { start: "11h00", end: "13h00", subject: "Cours2", intervenant: "Intervenant 6", room: "Salle" },
            { start: "14h00", end: "18h00", subject: "Cours9", intervenant: "Intervenant 3", room: "Salle" },
          ],
        },
        "Iris 2": {
          "Mercredi": [
            { start: "09h00", end: "13h00", subject: "Cours2", intervenant: "Intervenant 6", room: "Salle" },
            { start: "14h00", end: "18h00", subject: "Cours5", intervenant: "Intervenant 8", room: "Salle" },
          ],
          "Jeudi": [
            { start: "09h00", end: "10h30", subject: "Cours1", intervenant: "Intervenant 10", room: "Salle" },
            { start: "10h30", end: "12h00", subject: "Cours3", intervenant: "Intervenant 7", room: "Salle" },
            { start: "13h00", end: "18h00", subject: "Cours1", intervenant: "Intervenant 11", room: "Salle" },
          ],
          "Vendredi": [
            { start: "09h00", end: "11h00", subject: "Cours3", intervenant: "Intervenant 9", room: "Salle" },
            { start: "11h00", end: "13h00", subject: "Cours8", intervenant: "Intervenant 3", room: "Salle" },
            { start: "14h00", end: "18h00", subject: "Cours7", intervenant: "Intervenant 4", room: "Salle" },
          ],
        },
      };

      /* ========================================================= */

      const classSelect = document.getElementById("classSelect");
      const timetableGrid = document.getElementById("timetable-grid");
      const legend = document.getElementById("legend");
      const rowHeight = 40; // px par tranche de 30 min

      // Liste des salles, initialisée à partir des données existantes
      const rooms = Array.from(
        new Set(
          Object.values(schedule)
            .flatMap((classData) => Object.values(classData))
            .flat()
            .map((c) => c.room.trim())
            .filter(Boolean)
        )
      ).sort();

      // Génère les créneaux de 30 min entre le premier et le dernier hourSlots
      function generateTimeOptions() {
        const opts = [];
        const startH = parseInt(hourSlots[0], 10);
        const endH = parseInt(hourSlots[hourSlots.length - 1], 10);
        for (let h = startH; h <= endH; h++) {
          opts.push(`${String(h).padStart(2, "0")}h00`);
          if (h < endH) opts.push(`${String(h).padStart(2, "0")}h30`);
        }
        return opts;
      }
      const timeOptions = generateTimeOptions();

      function populateSelect(selectEl, values, placeholder) {
        selectEl.innerHTML = "";
        if (placeholder) {
          const opt = document.createElement("option");
          opt.value = "";
          opt.textContent = placeholder;
          opt.disabled = true;
          selectEl.appendChild(opt);
        }
        values.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = v;
          opt.textContent = v;
          selectEl.appendChild(opt);
        });
      }

      // Peupler le sélecteur de classes
      function populateClassSelect(selected) {
        const previous = selected || classSelect.value;
        classSelect.innerHTML = "";
        Object.keys(schedule).forEach((className) => {
          const opt = document.createElement("option");
          opt.value = className;
          opt.textContent = className;
          classSelect.appendChild(opt);
        });
        if (previous && schedule[previous]) classSelect.value = previous;
      }
      populateClassSelect();

      // Convertit "09h00" -> 9 (en heures décimales)
      function toDecimalHour(str) {
        const [h, m] = str.split("h").map(Number);
        return h + m / 60;
      }

      function renderLegend(className) {
        legend.innerHTML = "";
        const usedSubjects = new Set();
        Object.values(schedule[className] || {}).forEach((day) => {
          day.forEach((c) => usedSubjects.add(c.subject.trim()));
        });
        usedSubjects.forEach((subject) => {
          const colorClass = getColorForSubject(subject);
          const chip = document.createElement("span");
          chip.className = `px-2 py-1 rounded-full border ${colorClass} font-medium`;
          chip.textContent = subject;
          legend.appendChild(chip);
        });
      }

      function renderGrid(className) {
        // On ne supprime que les cellules générées précédemment : les 6 cellules
        // d'en-tête sont statiques dans le HTML et ne doivent pas être touchées.
        timetableGrid.querySelectorAll(".generated-cell").forEach((el) => el.remove());
        const classData = schedule[className] || {};
        const startHour = toDecimalHour(hourSlots[0]);
        const totalRows = (hourSlots.length - 1) * 2; // demi-heures

        // Construire les lignes horaires
        // NB: on place chaque cellule explicitement avec grid-column / grid-row
        // (l'auto-placement CSS Grid casse dès qu'on saute une cellule fusionnée).
        for (let r = 0; r < totalRows; r++) {
          const isFirstHalf = r % 2 === 0;
          const currentHour = startHour + r * 0.5;
          const hourLabel = hourSlots[r / 2];
          const gridRowIndex = r + 2; // +2 car la ligne 1 est l'en-tête des jours

          // Colonne heure
          const hourCell = document.createElement("div");
          hourCell.className =
            "generated-cell border-r border-gray-800 flex items-start justify-start pl-1 text-xs text-gray-700 bg-gray-50" +
            (r === totalRows - 1 ? "" : " border-b");
          hourCell.style.height = rowHeight + "px";
          hourCell.style.gridColumn = "1";
          hourCell.style.gridRow = String(gridRowIndex);
          hourCell.textContent = isFirstHalf ? hourLabel : "";
          timetableGrid.appendChild(hourCell);

          // Colonnes des jours
          for (let d = 0; d < dayNames.length; d++) {
            const day = dayNames[d];
            const courses = classData[day] || [];
            const gridColIndex = d + 2; // +2 car la colonne 1 est celle des heures

            // Chercher un cours qui commence exactement à cette demi-heure
            const courseIndex = courses.findIndex((c) => toDecimalHour(c.start) === currentHour);
            const course = courseIndex !== -1 ? courses[courseIndex] : null;

            if (course) {
              const durationSlots = (toDecimalHour(course.end) - toDecimalHour(course.start)) * 2;
              const colorClass = getColorForSubject(course.subject);
              const cell = document.createElement("div");
              cell.className =
                `generated-cell border-r ${d === dayNames.length - 1 ? "border-r-0" : ""} border-gray-800 p-0 cursor-pointer group`;
              cell.style.gridColumn = String(gridColIndex);
              cell.style.gridRow = `${gridRowIndex} / span ${durationSlots}`;
              cell.title = "Cliquer pour modifier ce cours";
              cell.innerHTML = `
                <div class="h-full w-full ${colorClass} border-l-4 px-2 py-1 flex flex-col justify-center overflow-hidden group-hover:brightness-95 transition">
                  <p class="text-xs font-bold leading-tight truncate">${course.subject}</p>
                  <p class="text-[11px] leading-tight truncate">${course.intervenant}</p>
                  <p class="text-[11px] leading-tight opacity-75 truncate">${course.room}</p>
                </div>`;
              cell.addEventListener("click", () => openCourseModal({ day, index: courseIndex }));
              timetableGrid.appendChild(cell);
            } else {
              // Vérifier si cette case est déjà couverte par un cours qui a démarré avant
              const covered = courses.some(
                (c) => toDecimalHour(c.start) < currentHour && toDecimalHour(c.end) > currentHour
              );
              if (covered) continue; // rien à dessiner, la cellule est fusionnée au-dessus

              const cell = document.createElement("div");
              cell.style.height = rowHeight + "px";
              cell.style.gridColumn = String(gridColIndex);
              cell.style.gridRow = String(gridRowIndex);
              cell.className =
                "generated-cell border-r border-gray-800 bg-gray-100 hover:bg-amber-50 cursor-pointer transition" +
                (d === dayNames.length - 1 ? " border-r-0" : "") +
                (r === totalRows - 1 ? "" : " border-b");
              cell.title = "Cliquer pour ajouter un cours";
              cell.addEventListener("click", () => openCourseModal({ day, prefillStart: hourLabelForHour(currentHour) }));
              timetableGrid.appendChild(cell);
            }
          }
        }
      }

      // Convertit une heure décimale (ex: 10.5) en libellé "10h30"
      function hourLabelForHour(decimalHour) {
        const h = Math.floor(decimalHour);
        const m = Math.round((decimalHour - h) * 60);
        return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
      }

      // Gestion de la semaine affichée (en-têtes de jours avec dates)
      let currentMonday = getMonday(new Date());

      function getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
      }

      function updateWeekDisplay() {
        const start = new Date(currentMonday);
        const end = new Date(currentMonday);
        end.setDate(end.getDate() + 4);

        document.getElementById("weekLabel").textContent =
          `Semaine du ${start.getDate()} au ${end.getDate()} ${monthNames[end.getMonth()]}`;

        for (let i = 0; i < 5; i++) {
          const d = new Date(currentMonday);
          d.setDate(d.getDate() + i);
          document.getElementById("day-" + i).textContent =
            `${dayNames[i]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
        }
      }

      function refreshAll() {
        updateWeekDisplay();
        renderGrid(classSelect.value);
        renderLegend(classSelect.value);
      }

      document.getElementById("prevWeek").addEventListener("click", () => {
        currentMonday.setDate(currentMonday.getDate() - 7);
        refreshAll();
      });

      document.getElementById("nextWeek").addEventListener("click", () => {
        currentMonday.setDate(currentMonday.getDate() + 7);
        refreshAll();
      });

      classSelect.addEventListener("change", refreshAll);

      /* =========================================================
         GESTION DES MODALES
      ========================================================= */
      function showModal(id) {
        const el = document.getElementById(id);
        el.classList.remove("hidden");
        el.classList.add("flex");
      }
      function hideModal(id) {
        const el = document.getElementById(id);
        el.classList.add("hidden");
        el.classList.remove("flex");
      }

      /* --- Ajouter une classe --- */
      const modalAddClass = "modal-add-class";
      document.getElementById("btn-add-class").addEventListener("click", () => {
        document.getElementById("new-class-name").value = "";
        showModal(modalAddClass);
        document.getElementById("new-class-name").focus();
      });
      document.getElementById("cancel-add-class").addEventListener("click", () => hideModal(modalAddClass));
      document.getElementById("confirm-add-class").addEventListener("click", () => {
        const name = document.getElementById("new-class-name").value.trim();
        if (!name) return alert("Merci de saisir un nom de classe.");
        if (schedule[name]) return alert("Cette classe existe déjà.");
        schedule[name] = {};
        populateClassSelect(name);
        hideModal(modalAddClass);
        refreshAll();
      });

      /* --- Ajouter une salle --- */
      const modalAddRoom = "modal-add-room";
      document.getElementById("btn-add-room").addEventListener("click", () => {
        document.getElementById("new-room-name").value = "";
        showModal(modalAddRoom);
        document.getElementById("new-room-name").focus();
      });
      document.getElementById("cancel-add-room").addEventListener("click", () => hideModal(modalAddRoom));
      document.getElementById("confirm-add-room").addEventListener("click", () => {
        const name = document.getElementById("new-room-name").value.trim();
        if (!name) return alert("Merci de saisir un nom de salle.");
        if (rooms.includes(name)) return alert("Cette salle existe déjà.");
        rooms.push(name);
        rooms.sort();
        hideModal(modalAddRoom);
      });

      /* --- Ajouter / modifier / supprimer un cours --- */
      const modalCourse = "modal-course";
      const courseDayEl = document.getElementById("course-day");
      const courseStartEl = document.getElementById("course-start");
      const courseEndEl = document.getElementById("course-end");
      const courseSubjectEl = document.getElementById("course-subject");
      const courseIntervenantEl = document.getElementById("course-intervenant");
      const courseRoomEl = document.getElementById("course-room");
      const courseErrorEl = document.getElementById("course-modal-error");
      const deleteCourseBtn = document.getElementById("delete-course");

      let editingCourse = null; // { day, index } si on modifie un cours existant

      function showCourseError(message) {
        courseErrorEl.textContent = message;
        courseErrorEl.classList.remove("hidden");
      }
      function clearCourseError() {
        courseErrorEl.classList.add("hidden");
      }

      // options = { day, index } pour éditer un cours existant
      // options = { day, prefillStart } pour créer un cours à un créneau donné
      function openCourseModal(options = {}) {
        if (!classSelect.value) return alert("Merci de sélectionner ou créer une classe d'abord.");
        clearCourseError();
        populateSelect(courseDayEl, dayNames);
        populateSelect(courseStartEl, timeOptions);
        populateSelect(courseEndEl, timeOptions);
        populateSelect(courseRoomEl, rooms.length ? rooms : ["Salle"], rooms.length ? null : null);

        document.getElementById("course-modal-class").textContent = `Classe : ${classSelect.value}`;

        if (options.index !== undefined) {
          // Édition d'un cours existant
          const course = schedule[classSelect.value][options.day][options.index];
          editingCourse = { day: options.day, index: options.index };
          document.getElementById("course-modal-title").textContent = "Modifier le cours";
          courseDayEl.value = options.day;
          courseStartEl.value = course.start;
          courseEndEl.value = course.end;
          courseSubjectEl.value = course.subject.trim();
          courseIntervenantEl.value = course.intervenant.trim();
          if (!rooms.includes(course.room.trim())) {
            const opt = document.createElement("option");
            opt.value = course.room.trim();
            opt.textContent = course.room.trim();
            courseRoomEl.appendChild(opt);
          }
          courseRoomEl.value = course.room.trim();
          deleteCourseBtn.classList.remove("hidden");
        } else {
          // Nouveau cours
          editingCourse = null;
          document.getElementById("course-modal-title").textContent = "Ajouter un cours";
          courseDayEl.value = options.day || dayNames[0];
          courseStartEl.value = options.prefillStart || timeOptions[0];
          courseEndEl.value = timeOptions[Math.min(timeOptions.indexOf(courseStartEl.value) + 2, timeOptions.length - 1)];
          courseSubjectEl.value = "";
          courseIntervenantEl.value = "";
          if (rooms.length) courseRoomEl.value = rooms[0];
          deleteCourseBtn.classList.add("hidden");
        }

        showModal(modalCourse);
      }

      document.getElementById("btn-add-course").addEventListener("click", () => openCourseModal());
      document.getElementById("cancel-course").addEventListener("click", () => hideModal(modalCourse));

      document.getElementById("confirm-course").addEventListener("click", () => {
        clearCourseError();
        const day = courseDayEl.value;
        const start = courseStartEl.value;
        const end = courseEndEl.value;
        const subject = courseSubjectEl.value.trim();
        const intervenant = courseIntervenantEl.value.trim();
        const room = courseRoomEl.value;

        if (!subject) return showCourseError("Merci de renseigner la matière.");
        if (!intervenant) return showCourseError("Merci de renseigner l'intervenant.");
        if (toDecimalHour(end) <= toDecimalHour(start)) {
          return showCourseError("L'heure de fin doit être après l'heure de début.");
        }

        const className = classSelect.value;
        if (!schedule[className][day]) schedule[className][day] = [];

        // Retirer l'ancien cours si on est en mode édition
        if (editingCourse) {
          schedule[className][editingCourse.day].splice(editingCourse.index, 1);
        }

        // Vérifier les chevauchements avec les autres cours du même jour
        const overlap = schedule[className][day].some(
          (c) => toDecimalHour(c.start) < toDecimalHour(end) && toDecimalHour(c.end) > toDecimalHour(start)
        );
        if (overlap) {
          const confirmOverlap = confirm(
            "Ce créneau chevauche un autre cours de cette classe. Enregistrer quand même ?"
          );
          if (!confirmOverlap) {
            // On remet l'ancien cours en place si l'utilisateur annule
            if (editingCourse) {
              schedule[className][editingCourse.day].splice(editingCourse.index, 0, {
                start, end, subject, intervenant, room,
              });
            }
            return;
          }
        }

        schedule[className][day].push({ start, end, subject, intervenant, room });
        hideModal(modalCourse);
        refreshAll();
      });

      deleteCourseBtn.addEventListener("click", () => {
        if (!editingCourse) return;
        const className = classSelect.value;
        schedule[className][editingCourse.day].splice(editingCourse.index, 1);
        hideModal(modalCourse);
        refreshAll();
      });

      // Fermer les modales en cliquant sur le fond
      [modalAddClass, modalAddRoom, modalCourse].forEach((id) => {
        document.getElementById(id).addEventListener("click", (e) => {
          if (e.target.id === id) hideModal(id);
        });
      });

      // Initialisation
      refreshAll();
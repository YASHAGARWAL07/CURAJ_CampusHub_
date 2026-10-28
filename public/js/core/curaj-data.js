/* ═══════════════════════════════════════════════════════════════
   CURAJ MASTER DATA  –  Dept → Program → Semester → Subject
   ═══════════════════════════════════════════════════════════════ */
const CURAJ = (() => {

  const DATA = {
    "Computer Science and Engineering": {
      "B.Tech (CSE)": {
        "1": ["Engineering Mathematics-I","Engineering Physics","Basic Electrical Engineering","English (Communication and Writing)","Engineering Graphics & Design","Engineering Physics Lab"],
        "2": ["Engineering Mathematics-II","Introduction to Programming","Basic Electronics Engineering","Engineering Chemistry","Workshop Practice","Programming Lab","UHV"],
        "3": ["Discrete Mathematics","Computer Organization","Theory of Computation","Programming Methodology","Data Structures and Algorithms","IT Workshop","Data Structures and Algorithm Lab"],
        "4": ["Principles and Practices of Management","Design and Analysis of Algorithms","Operating Systems","Object Oriented Programming","Digital Systems Design","Operating Systems Lab","OOP Lab","Digital Systems Design Lab"],
        "5": ["Environmental Studies","Computer Networks","Compiler Design","Computer Graphics","Database Management Systems","Computer Networks Lab","Computer Graphics Lab","Compiler Design Lab","DBMS Lab"],
        "6": ["Managerial Economics","Data Communication","Cryptography and Network Security","Software Engineering","Artificial Intelligence & Machine Learning","Cryptography and Network Security Lab","Software Engineering Lab","AI & ML Lab"],
        "7": ["Project Design","Program Elective I","Program Elective II","Open Elective I","Project Design Lab","Project/Dissertation-I"],
        "8": ["SSR/MOOCs","Program Elective III","Open Elective-II","Project/Dissertation-II","Fitness","Societal Interface"]
      },
      "M.Tech CSE": {
        "1": ["Advanced Algorithms","Advanced OS","Research Methodology"]
      }
    },
    "Electronics and Communication Engineering": {
      "B.Tech (ECE)": {
        "1": ["Engineering Mathematics-I","Engineering Physics","Basic Electrical Engineering","English (Language and Communication Writing Skills-I)","Engineering Graphics & Design","Engineering Physics Lab"],
        "2": ["Engineering Mathematics-II","Introduction to Programming","Basic Electronics Engineering","Universal Human Value (UHV)","Workshop Practice","Programming Lab","Engineering Chemistry"],
        "3": ["Discrete Mathematics","Electronics Devices and Circuits","Electronic Measurement and Instrumentation","Circuit Theory and Network Analysis","Data Structures & Algorithms","Electronic Devices and Circuits Lab","Electronic Measurement and Instrumentation Lab","Data Structure and Algorithm Lab"],
        "4": ["Principles and Practices of Management","Electromagnetic Wave and Transmission Line","Signal and System","Analog and Linear Integrated Circuit","Digital System Design","Signal and System Lab","Analog and Linear Integrated Circuit Lab","Digital System Design Lab","Seminar-I"],
        "5": ["Environmental Studies","Control System Engineering","Analog Communication System","Antenna and Wave Propagation","Digital Communication and System","Analog and Digital Communication Lab","Antenna and Wave Propagation Lab","Electronic Circuit Design Workshop"],
        "6": ["Managerial Economics","Optical Fiber Communication","Power Electronics","Microcontrollers and Embedded System","Microwave Theory and Techniques","Microcontrollers and Embedded System Lab","Microwave Theory and Techniques Lab","Optical Fiber Communication Lab","Seminar-II"],
        "7": ["VLSI Design and Technology","Digital Signal Processing","Program Elective I","Open Elective I","VLSI Design and Technology Lab","Digital Signal Processing Lab","Project-I"],
        "8": ["Program Elective II","Program Elective III","Open Elective II","Open Elective III","Project-II"]
      }
    },
    "Biomedical Engineering": {
      "B.Tech BME": {
        "1": ["Engineering Mathematics-I","Introduction to Biomedical Engineering","Basic Electrical Engineering","English (Language and Communication Writing Skills-I)","Introduction to Programming","Programming Lab"],
        "2": ["Engineering Mathematics-II","Basic Electronics Engineering","Universal Human Value (UHV)","Biomedical Engineering Workshop","Engineering Physics","Engineering Chemistry"],
        "3": ["Signals and System Design","Biomedical Instrumentations","Pathology and Human Diseases","Biomaterials","Digital System Design","Biomedical Instrumentations and Devices Lab","Biomaterials Lab","Digital System Design Lab"],
        "4": ["Biomechanics","Electronic Devices and Circuits","Molecular and Cellular Biology","Circuit Theory and Network Analysis","Human Anatomy and Physiology","Electronic Devices and Circuits Lab","Molecular and Cellular Biology Lab","Human Anatomy and Physiology Laboratory"],
        "5": ["Environmental Studies","Biomedical Imaging","Invasive and Non-invasive Medical Diagnostic Technique","Analog Electronics","Program Electives I","Immunotechnology Lab","Analog Electronics Lab","Biomedical Imaging Laboratory"],
        "6": ["Measurements and Instrumentations","Sensors & Transducers in Healthcare","Microcontrollers and Embedded System","Medical Image Processing","Program Electives II","Project I"],
        "7": ["Digital Signal Processing","Biological Control Systems","Biomics Implants and Artificial Organs","Neuroscience and Neurotechnology","Project II","Short Internship","Program Electives III"],
        "8": ["Program Electives IV","Program Electives V","Program Electives VI","Project III"]
      }
    },
    "Computer Science": {
      "Integrated M.Sc. Computer Science": {
        "1": ["Computer Fundamentals & Programming in C","C Programming Lab"],
        "2": ["Object Oriented Programming in C++","C++ Programming Lab","ICT"],
        "3": ["Data Structures","Data Structure Lab"],
        "4": ["Database Management System","Database Management Lab"],
        "5": ["Computer Networks","Theory of Computation","Software Engineering","Elective-I (Science)","Elective-II"],
        "6": ["Design & Analysis of Algorithms","Operating System","Computer Systems Architecture","Project + Seminar","Elective III","Elective IV"],
        "7": ["Introduction to Artificial Intelligence","Discrete Structures & Graph Theory","Probability & Statistics","Advanced Algorithms","Programming in Python","Professional Communication","AI Lab","Advanced Algorithms Lab"],
        "8": ["Machine Learning","Big Data Analytics","Natural Language Processing","Soft Computing","Elective-V","Dissertation-I","Machine Learning Lab","BDA Lab"],
        "9": ["Data Warehousing & Mining","Neural Network & Deep Learning","Image Processing & Computer Vision","Elective-VI","Elective-VII","Dissertation-II","Data Warehousing & Mining Lab","Neural Network & Deep Learning Lab","Summer Training Presentation"],
        "10": ["Project Work in Industry or Institution (16 week)","Self-Study Course"]
      }
    },
    "Biochemistry": {
      "Integrated M.Sc. (Biochemistry)": {
        "1": ["Biology-I: Diversity of Life","Biology Practical-I","Chemistry","Mathematics","Physics","English"],
        "2": ["Biology-II: Techniques for Biology","Chemistry","Mathematics","Physics","English/ICT"],
        "3": ["Biology-III: Biochemical Constituents of Life","Chemistry","Physics","Environmental Science","Open Elective II"],
        "4": ["Biology-IV: Structural Organization of Life","Biology Practical-II","Chemistry","Maths","Statistics","CS","Economics","Open Elective-I: Ecology and Evolution","Open Elective-II"],
        "5": ["Biology-V: Functional Organization of Life","Biology-VI: Reproductive Biology","Biology-VII: Genetics","Biology Practical-III","Open Elective-I: Lab Safety, Ethics and IPR","Open Elective-II"],
        "6": ["Biology-VIII: Interactive Biology","Biology-IX: Introduction to Gene Technology","Biology-X: Trends in Biology","Biology Practical-IV","Open Elective-I: Current Trends in Environmental Sciences","Open Elective-II"],
        "7": ["Fundamentals of Biochemistry","Molecular Genetics","Cell Biology","Microbiology","Bioenergetics","Human Physiology","Biochemistry Practical","Microbiology Practical","Open Elective"],
        "8": ["Immunology","Developmental Biology","Plant Biochemistry","Enzymology and Protein Engineering","Elective I","Elective II","Immunology Practical","Enzymology and Plant Biochemistry Practical","Health Awareness"],
        "9": ["Clinical Biochemistry","Genetic Engineering","Biophysics and Bioinformatics","Bioanalytical Methods","Biosafety and Lab Safety and IPR","Elective III","Molecular Biology Practical","Clinical Biochemistry Practical","Fundamentals of Research Methodology"],
        "10": ["Journal Club Presentation","Review of Literature and Project Proposal","Major Project","Research Dissertation Presentation"]
      },
      "M.Sc. Biochemistry (2-year)": {
        "1": ["Biomolecules and Metabolism","Immunology","Cell Biology and Cell Signaling","Genetics","Microbiology","Discipline Specific Elective-I","Methods in Biochemistry and Microbiology","Methods in Cell Biology and Immunology"],
        "2": ["Clinical Biochemistry","Molecular Biology","Enzymology","Discipline Specific Elective-II","Non Discipline Specific Elective-I","Techniques in Molecular Biology and Enzymology","Techniques in Clinical Biochemistry","Dissertation I","Internship"],
        "3": ["Biophysics and Bioinformatics","Analytical Biochemistry","Human Physiology","Plant Physiology and Biochemistry","Discipline Specific Elective-III","Non Discipline Specific Elective-II","Methods in Human Physiology and Computational Biology","Methods in Analytical Biochemistry and Plant Tissue Culture"],
        "4": ["Discipline Specific Elective-IV","Research Paper Presentation","Dissertation Presentation","Dissertation II (Major Project)"]
      }
    },
    "Chemistry": {
      "Integrated M.Sc. Chemistry": {
        "1": ["Inorganic Chemistry-I","Basic Inorganic Chemistry Laboratory-I","Calculus-I or Mathematics-I","Language and Communication Skills-I","Mechanics","Biology-I","Computer Fundamentals & Programming in C","Principles of Microeconomics","Descriptive Statistics and Practical"],
        "2": ["Organic Chemistry-I","Basic Organic Chemistry Laboratory-I","Calculus-II","Language and Communication Skills-I or ICT","Basic Electronics and Physics Lab-I","Biology-II (Techniques for Biology)","Object Oriented Programming in C++","Principles of Macroeconomics","Probability and Random Variables and Practical"],
        "3": ["Physical Chemistry-I","Basic Physical Chemistry Laboratory-I","Environmental Studies","Introduction to Public Administration","Modern Physics","Biology-III (Biochemical Constituents of Life)","Data Structures and Data Structures Lab","Fundamentals of Finance","Probability Distributions and Practical","Differential Equation"],
        "4": ["Analytical Chemistry","Basic Analytical Chemistry Laboratory","Open Elective from Science Courses","Open Elective from Social Sciences Courses","Properties of Matter and Waves and Physics Lab-II","Biology-IV (Structural Organization of Life)","Database Management System","Issues in Indian Economy","Statistical Inference-I and Practical","Discrete Mathematics"],
        "5": ["Inorganic Chemistry-II","Organic Chemistry-II","Basic Inorganic Chemistry Lab-II","Basic Organic Chemistry Lab-II","Open Elective from Science","Open Elective from Social Science"],
        "6": ["Physical Chemistry-II","Selected Topics in Chemistry","Basic Physical Chemistry Lab-II","Project","Open Elective from Science","Open Elective from Social Science"],
        "7": ["Chemistry of Main Group Elements","Stereochemistry and Reaction Mechanism","Quantum Chemistry","Group Theory and Molecular Spectroscopy","Elective-I (Discipline Specific)","Inorganic Chemistry Laboratory-I","Organic Chemistry Laboratory-I","Physical Chemistry Laboratory-I"],
        "8": ["Coordination Chemistry","Synthetic Methods in Organic Chemistry","Thermodynamics","Spectroscopic Methods of Structure Determination","Elective-II (Discipline Specific)","Inorganic Chemistry Laboratory-II","Organic Chemistry Laboratory-II","Physical Chemistry Laboratory-II"],
        "9": ["Organometallic Chemistry","Pericyclic Reactions and Photochemistry","Solid State & Material Chemistry","Basic Bioinorganic Chemistry","Elective-III (Discipline Specific)","Open Elective-I","Inorganic Chemistry Laboratory-III","Organic Chemistry Laboratory-III","Physical Chemistry Laboratory-III"],
        "10": ["Research Project / Dissertation","Elective-IV (Discipline Specific)","Open Elective-II"]
      },
      "Integrated M.Sc. B.Ed (3-year)": {
        "1": ["Chemistry of Main Group Elements","Stereochemistry and Reaction Mechanism","Quantum Chemistry","Group Theory and Molecular Spectroscopy","Basics of Education","Senior Secondary Education in India","Inorganic Chemistry Laboratory I","Organic Chemistry Laboratory I","Physical Chemistry Laboratory I"],
        "2": ["Coordination Chemistry","Synthetic Methods in Organic Chemistry","Thermodynamics","Spectroscopic Methods of Structure Determination","Philosophy of Chemistry","Learner and Learning","Inorganic Chemistry Laboratory II","Organic Chemistry Laboratory II","Physical Chemistry Laboratory II"],
        "3": ["Organometallic Chemistry","Pericyclic Reactions and Photochemistry","Solid State & Material Chemistry","Basic Bioinorganic Chemistry","Teaching Approaches and Strategies","Pedagogy of Chemistry-I","Inorganic Chemistry Laboratory III","Organic Chemistry Laboratory III","Physical Chemistry Laboratory III"],
        "4": ["Elective-I (Discipline Specific Elective)","Elective-II (Discipline Specific Elective)","Open Elective-I","Learning Assessment","Pedagogy of Chemistry-II","Classroom Organization and Management"],
        "5": ["Internship","Internship and Teaching Practice"],
        "6": ["Research Project / Dissertation (Chemistry)","Open Elective-II","Project / Dissertation (Education)"]
      }
    },
    "Physics": {
      "Int. M.Sc. Physics (5-Year)": {
        "1": ["Mechanics","Physics Lab I","Mathematics","Basic Courses","English"],
        "2": ["Basic Electronics","Physics Lab II","Mathematics","Basic Courses","English / ICT"],
        "3": ["Modern Physics","Physics Lab III","Basic Courses","Environmental Science","Elective Science","Elective Social Science"],
        "4": ["Properties of Matter and Waves","Physics Lab IV","Basic Courses","Elective Science","Elective Social Science"],
        "5": ["Electricity and Magnetism","Heat and Thermodynamics","Mathematical Physics","Physics Lab V","Elective Science","Elective Social Science"],
        "6": ["Advanced Modern Physics","Optics","Atomic and Nuclear Physics","Physics Lab VI","Elective Science","Elective Social Science"],
        "7": ["Mathematical Methods in Physics","Classical Mechanics","Quantum Mechanics","Classical Electrodynamics","Electronics"],
        "8": ["Statistical Mechanics","Atomic and Molecular Physics","Nuclear and Particle Physics","Computational Physics","Physics Laboratory"],
        "9": ["Condensed Matter Physics","Discipline Specific Elective-I","Open Elective-I","Project-I","Internship"],
        "10": ["Discipline Specific Elective-II","Open Elective-II","Project-II","Seminar"]
      },
      "M.Sc. B.Ed. (Innovative) Physics": {
        "1": ["Mathematical Physics","Classical Mechanics","Quantum Mechanics","Classical Electrodynamics","Basics of Education","Senior Secondary Education in India: SCS"],
        "2": ["Statistical Mechanics","Computational Physics","Physics Lab","Learner and Learning","Teaching Approaches and Strategies","Open Elective I"],
        "3": ["Condensed Matter Physics","Electronics","Learning Assessment","Pedagogy of Science","DSE I","Internship"],
        "4": ["Atomic and Molecular Physics","Nuclear and Particle Physics","Classroom Organization and Management","Pedagogy of Physics","DSE II","Open Elective II"],
        "5": ["School Internship-I","School Internship-II","Action Research in School","Community Based Participatory Research"],
        "6": ["DSE III","Open Elective III","Project","Seminar"]
      }
    },
    "Mathematics": {
      "Integrated M.Sc. Mathematics": {
        "1": ["Calculus-I","Mathematics-I"],
        "2": ["Calculus-II","Mathematics-II"],
        "3": ["Ordinary Differential Equations"],
        "4": ["Discrete Mathematics"],
        "5": ["Foundation of Linear Algebra","Metric Space and Riemann Integration","3-Dimensional Geometry","Elective","Generic Elective","Self-study Course"],
        "6": ["Foundation of Abstract Algebra","Foundation of Complex Analysis","Linear and Nonlinear Programming","Elective","Generic Elective","Minor Project"],
        "7": ["Linear Algebra","Real Analysis","Topology","Elective","Generic Elective"],
        "8": ["Complex Analysis","Mathematical Programming","Abstract Algebra","Qualitative Theory of Ordinary Differential Equations","Elective","MOOC Course"],
        "9": ["Functional Analysis","Mathematical Modeling","MOOC","Elective Paper","Elective Paper (Self Study)","Summer Internship"],
        "10": ["Major Project Dissertation in Mathematics","Elective Paper"]
      },
      "M.Sc. B.Ed. Mathematics": {
        "1": ["Linear Algebra","Real Analysis","Topology","Elective Paper (Subjective)","Elective Paper","Basics of Education","Senior Secondary Education in India"],
        "2": ["Complex Analysis","Mathematical Programming","Abstract Algebra","Qualitative Theory of Ordinary Differential Equations","MOOC","Philosophy of Mathematics","Learner and Learning"],
        "3": ["Functional Analysis","Mathematical Modeling","MOOC","Elective Paper (Subjective)","Generic Elective","Learning Assessment","Pedagogy of Science / Social Science"],
        "4": ["Seminar","Classical Mechanics","Elective Paper","MOOC"],
        "5": ["School Internship-I","School Internship & Teaching Practice-II","Action Research in Schools","One Course from Education Department"],
        "6": ["Major Project Dissertation in Mathematics","Elective Paper (Subjective)","Elective Paper","UHV"]
      }
    },
    "Sustainable Architecture": {
      "M.Arch. (Sustainable Architecture)": {
        "1": ["Introduction to Sustainable Development and Architecture","Sustainable Building Materials and Technology","Ecology and Environmental Management","Climatology and Building Physics","Sustainable Architecture - Historical and Community Perspectives","Sustainable Architecture Design-I"],
        "2": ["Energy Efficient Building Design - Theory and Technologies","Building Services and Waste Management","D-Elective I","Seminar Course-I","Sustainable Architecture Design-II"],
        "3": ["Economic, Legal and Policy Framework for Sustainable Architecture","D-Elective II","Generic Elective","Professional and Research Writing Skill","Seminar Project-II","Dissertation"],
        "4": ["Generic Elective","Sustainable Architecture - Masters Design Thesis"]
      }
    },
    "Statistics": {
      "Integrated M.Sc./M.Sc. Statistics": {
        "1": ["Descriptive Statistics","Practicals using Excel","Introduction to Excel"],
        "2": ["Probability and Random Variable","Practicals using Excel"],
        "3": ["Probability Distributions","Practicals using R","Introduction to R"],
        "4": ["Statistical Inference-I","Practicals using R","Statistical Methods"],
        "5": ["Statistical Quality Control","Sample Surveys","Design of Experiments","Practicals using R","Open Elective (Science/Social Science)","Minor Project/Field trip/Internship"],
        "6": ["Statistical Inference-II","Operations Research","Applied Statistics","Practicals using R","Open Elective (Science)","Open Elective (Social Science)"],
        "7": ["Measure and Probability Theory","Distribution and Decision Theory","Sampling Theory and Methods","Real Analysis and Linear Algebra","Research Methodology","Statistical Computing using R","Self-Learning-I"],
        "8": ["Theory of Estimation and Testing of Hypothesis","Regression Analysis","Stochastic Processes","Introduction to Python","Elective Paper-I","Elective Paper-II","Self-Learning-II"],
        "9": ["Time Series and Forecasting","Advanced and Applied Multivariate","Planning and Analysis of Industrial Experiments","Elective Paper-III","Elective Paper-IV","Open Elective","Self-Learning-III"],
        "10": ["Major Project"]
      }
    },
    "Biotechnology": {
      "Integrated M.Sc. Biotechnology": {
        "1": ["Biology-I Diversity of Life","Biology Practical-I","Chemistry","Mathematics","Physics","English"],
        "2": ["Biology-II Techniques for Biology","Chemistry","Mathematics","Physics","English/ICT"],
        "3": ["Biology-III Biochemical Constituents of Life","Chemistry","Physics","Environmental Science"],
        "4": ["Biology-IV Structural Organization of Life","Biology Practical-II","Chemistry","Mathematics","Physics","English","Open Elective-I: Ecology and Evolution"],
        "5": ["Biology-V Functional Organization of Life","Biology-VI Reproductive Biology","Biology-VII Genetics","Biology Practical-III","Open Elective-I: Laboratory Safety, Ethics in Bio-Sciences and IPR"],
        "6": ["Biology-VIII Interactive Biology","Biology-IX Introduction to Gene Technology","Biology-X Trends in Biology","Biology Practical-IV","Open Elective-I: Environmental Sciences"],
        "7": ["Recombinant DNA Technology","Genomics and Proteomics","Immunology","Bioinformatics","Elective I","Research Methodology","Biotechnology Lab I"],
        "8": ["Industrial Biotechnology","Environmental Biotechnology","Biosafety and IPR","Elective II","Project I","Biotechnology Lab II"],
        "9": ["Plant Biotechnology","Animal Biotechnology","Nanobiotechnology","Elective III","Project II","Biotechnology Lab III"],
        "10": ["Major Project/Dissertation","Elective IV","Open Elective","Self-Study Course"]
      }
    },
    "Management": {
      "MBA": {
        "1": ["Management Principles and Organizational Behavior","Managerial Economics","Accounting for Managers","Quantitative Techniques","Business Research and Statistical Software","Soft Skills & Business Communication"],
        "2": ["Marketing Management","Financial Management","Human Resource Management","Production & Operations Management","Entrepreneurial Skills","Dissertation Project-I"],
        "3": ["Strategic Management","Business Ethics","Departmental Specific Electives","Open Elective","Summer Internship Project","Societal Interface"],
        "4": ["UHV-II","Departmental Specific Electives","Open Elective","Dissertation Project-II"]
      }
    },
    "Hindi": {
      "MA Hindi": {
        "1": ["हिन्दी साहित्य का इतिहास (आदिकाल से रीति काल)","हिन्दी भाषा का स्वरूप एवं इतिहास","प्राचीन एवं मध्यकालीन हिन्दी काव्य","हिन्दी आलोचना","वैकल्पिक-I","अनुवाद कौशल","Fitness","Societal"],
        "2": ["हिन्दी साहित्य का इतिहास (आधुनिक काल)","हिन्दी कहानी","हिन्दी उपन्यास","वैकल्पिक-I","शोध पत्र एवं प्रारूप लेखन","समाचार एवं विज्ञापन लेखन","व्यक्तित्व कौशल विकास"],
        "3": ["आधुनिक हिन्दी कविता","राजस्थानी लोक संस्कृति और साहित्य","भारतीय एवं पाश्चात्य साहित्य चिंतन","वैकल्पिक-I","वैकल्पिक-II","रचनात्मक लेखन"],
        "4": ["हिन्दी नाटक और रंगमंच","हिन्दी के अन्य गद्य रूप","वैकल्पिक-I","वैकल्पिक-II","लघु शोध परियोजना"]
      }
    }
  };

  const EXAM_TYPES = ["CIA_I", "CIA_II", "END_SEM"];
  const YEARS = [];
  for (var y = 2018; y <= new Date().getFullYear() + 2; y++) YEARS.push(y);

  function getDepartments()             { return Object.keys(DATA); }
  function getPrograms(dept)            { return DATA[dept] ? Object.keys(DATA[dept]) : []; }
  function getSemesters(dept, prog)     {
    if (!DATA[dept] || !DATA[dept][prog]) return [];
    return Object.keys(DATA[dept][prog]).map(Number).sort(function(a,b){return a-b;});
  }
  function getSubjects(dept, prog, sem) {
    return (DATA[dept] && DATA[dept][prog] && DATA[dept][prog][String(sem)]) ? DATA[dept][prog][String(sem)] : [];
  }

  /* ── setOptions: populate a <select> with options ─────────── */
  function setOptions(selectEl, items, placeholder) {
    if (!selectEl) return;
    var html = '<option value="">' + placeholder + '</option>';
    for (var i = 0; i < items.length; i++) {
      var raw  = String(items[i]);
      // Encode for safe HTML attribute and text — browsers decode &amp; back to & in .value
      var enc  = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      html += '<option value="' + enc + '">' + enc + '</option>';
    }
    selectEl.innerHTML = html;
    selectEl.value = '';
  }

  /* ── bind: wire up cascading dropdowns by element ID ──────── */
  function bind(cfg) {
    var dEl = document.getElementById(cfg.deptId);
    var pEl = cfg.progId    ? document.getElementById(cfg.progId)    : null;
    var sEl = cfg.semId     ? document.getElementById(cfg.semId)     : null;
    var xEl = cfg.subjectId ? document.getElementById(cfg.subjectId) : null;
    var eEl = cfg.examId    ? document.getElementById(cfg.examId)    : null;
    var yEl = cfg.yearId    ? document.getElementById(cfg.yearId)    : null;

    if (!dEl) { console.error('CURAJ.bind: element not found:', cfg.deptId); return; }

    /* Populate all dropdowns with initial state */
    setOptions(dEl, getDepartments(), 'Select Department');
    if (pEl) setOptions(pEl, [], 'Select Program');
    if (sEl) setOptions(sEl, [], 'Select Semester');
    if (xEl) setOptions(xEl, [], 'Select Subject');
    if (eEl) setOptions(eEl, EXAM_TYPES, 'Select Exam Type');
    if (yEl) setOptions(yEl, YEARS, 'Select Year');

    /* Department → Programs */
    dEl.onchange = function() {
      var dept = this.value;
      var progs = dept ? getPrograms(dept) : [];
      if (pEl) setOptions(pEl, progs, progs.length ? 'Select Program' : 'Select Department first');
      if (sEl) setOptions(sEl, [], 'Select Semester');
      if (xEl) setOptions(xEl, [], 'Select Subject');
    };

    /* Program → Semesters */
    if (pEl) pEl.onchange = function() {
      var dept = dEl.value, prog = this.value;
      var sems = (dept && prog) ? getSemesters(dept, prog) : [];
      if (sEl) {
        var html = '<option value="">' + (sems.length ? 'Select Semester' : 'Select Program first') + '</option>';
        for (var i = 0; i < sems.length; i++) {
          html += '<option value="' + sems[i] + '">Semester ' + sems[i] + '</option>';
        }
        sEl.innerHTML = html;
        sEl.value = '';
      }
      if (xEl) setOptions(xEl, [], 'Select Subject');
    };

    /* Semester → Subjects */
    if (sEl) sEl.onchange = function() {
      var dept = dEl.value;
      var prog = pEl ? pEl.value : '';
      var semNum = this.value;
      var subjects = (dept && prog && semNum) ? getSubjects(dept, prog, semNum) : [];
      if (xEl) setOptions(xEl, subjects, subjects.length ? 'Select Subject' : 'Select Semester first');
    };
  }

  /* Expose */
  return {
    DATA: DATA,
    EXAM_TYPES: EXAM_TYPES,
    YEARS: YEARS,
    getDepartments: getDepartments,
    getPrograms: getPrograms,
    getSemesters: getSemesters,
    getSubjects: getSubjects,
    CURAJSelect: { bind: bind }
  };
})();

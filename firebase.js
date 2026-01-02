    const firebaseConfig = {
      apiKey: "AIzaSyBTQA2hVf_Cer7SlkEZcoK08iL_68uORLQ",
      authDomain: "productivity-dashboard-45698.firebaseapp.com",
      projectId: "productivity-dashboard-45698",
      storageBucket: "productivity-dashboard-45698.firebasestorage.app",
      messagingSenderId: "783578670872",
      appId: "1:783578670872:web:5275e644d9a058aad4a06d",
      measurementId: "G-RQ7D7ZW5NN"
    };

    firebase.initializeApp(firebaseConfig);

    const auth = firebase.auth();
    const db = firebase.firestore();
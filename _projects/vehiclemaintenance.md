---
title: "Vehicle Maintenance React App"
excerpt: "Full stack webapp using Spring Boot for backend API and React with Vite on frontend"
layout: single
date: 2025-08-25
tags: [Java, API, Spring Boot, React, Vite, Typescript]
header:
    teaser: "/assets/images/vehicle.png"
---

![Asteroids](/assets/images/details.png)

I built this project essentially as the magnus opus to complete my college education. During my time at UC San Diego I took classes focused on various parts of web development from database design, backend design, frontends, security, and networking. Now that I knew all the individual parts I felt it was time to combine them into a solo-built full stack webapp that showcases my ability to put all the requisite parts together. This also served as a fun little playground to familiarize myself with web technologies such as Spring Boot, React, Vite, and Typescript. The app is quite simple at this point, a user can create an account and then enter vehicle information that they want to track maintenance for as well as maintenance that has been performed on the vehicles. The app is at an MVP stage, but I have been careful to design it as modular as possible which will allow me to continue working on it to add additional features as I have time to work on it. In the future I plan to implement optimistic updates on the frontend to allow for a more responsive frontend experience, an AI-powered microservice to allow users to ask for tips on how to maintain their vehicles, more detailed maintenance records with the option to upload related documents, and a searching and filtering feature to allow users to better locate the vehicles and maintenance records they are looking for.

Source code: [thedonutdan/VehicleMaintenanceReactApp](https://github.com/thedonutdan/VehicleMaintenanceReactApp)

Currently I do not have this project deployed. I am looking into sending out a small-scale deployment to allow for exploration of the app without installation however the source code can be run with the following commands:  
Start the backend:
```
cd backend
mvn install
mvn spring-boot:run
```
Start the frontend:
```
cd frontend
pnpm install
pnpm dev
```

Navigating to `localhost:5173` in the browser will open the app.
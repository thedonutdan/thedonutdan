---
title: "Asteroids"
excerpt: "Java Swing rendered clone of the Asteroids arcade game"
layout: single
date: 2025-06-25
tags: [Java, AWT, Swing, Asteroids]
header:
    teaser: "/assets/images/asteroids-crop.png"
---

![Asteroids](/assets/images/asteroids.png)

I embarked on this project after completing my Intro to Java course at Palomar College circa June 2020. We had covered the Java basics and done some static image rendering with Java AWT, but I wanted to dive a little deeper and I was missing the days in middle school when I was making a lot of games. Over the course of two days I wrote a scratch clone of [Asteroids](https://en.wikipedia.org/wiki/Asteroids_(video_game)). The project features all the OOP goodies, polymorphism, inheritance, abstract classes, the works. It also presented some fun challenges as my first introduction to vectors and vector calculus (Wikipedia was a savior for this) as well as concurrency issues. So, to the docs I went. Oracle's official docs had a treasure trove of information on how to properly create a runnable to handle the timer as well as general game control for checking collisions, updating positions, removing gamepieces, etc. I also meticulously commented java-doc compatible comments throughout the code.

Source code: [thedonutdan/Asteroids](https://github.com/thedonutdan/Asteroids)  
Java doc for TLDR: [Source Code Docs](https://thedonutdan.github.io/Asteroids/package-summary.html)

This project was a ton of fun. It brought to light new software engineering issues that I had not ever thought of as well as reminding me of how exciting programming can be.
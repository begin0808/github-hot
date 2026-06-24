# GitTrend — Timeline des projets GitHub tendance

[![Update Data](https://github.com/begin0808/github-hot/actions/workflows/update-data.yml/badge.svg)](https://github.com/begin0808/github-hot/actions/workflows/update-data.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) | [繁體中文](README_zh-TW.md) | [简体中文](README_zh-CN.md) | [日本語](README_ja.md) | [한국어](README_ko.md) | Français | [Deutsch](README_de.md)

> Une timeline mise à jour automatiquement chaque samedi présentant les projets open source les plus populaires sur GitHub, avec des résumés structurés générés par l'IA Gemini pour vous aider à saisir rapidement les dernières tendances de l'open source.

---

## 📖 Aperçu du Projet

**GitTrend** est un site web statique qui regroupe automatiquement les projets open source nouvellement créés sur GitHub ayant reçu le plus d'étoiles sur différentes périodes (**Semaine, Mois, Trimestre, Année**), ainsi qu'une section dédiée à l'**IA Audio & Vidéo**. Grâce à l'IA Google Gemini, les descriptions originales en anglais sont traduites et synthétisées en **plusieurs langues**, présentant de manière structurée les « Fonctionnalités Clés & Points Forts » et les « Cas d'Utilisation Pratiques » de chaque projet.

Le site est mis à jour automatiquement chaque samedi via GitHub Actions, vous laissant tout le week-end pour explorer l'énergie des derniers projets tendance.

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
| :--- | :--- |
| 🕐 **Timeline à 5 étapes** | Comprend cinq onglets : « Hebdomadaire », « Mensuel », « Trimestriel », « Annuel » et « IA Audio & Vidéo ». Changez de vue en un clic pour découvrir les 12 projets les plus populaires de chaque période. |
| 🤖 **Synthèse IA par Gemini** | Utilise Google Gemini 3.5 Flash pour traduire et structurer les descriptions originales en plusieurs langues fluides, réparties en « Fonctionnalités Clés » et « Cas d'Utilisation ». |
| ☀️/🌙 **Changement de Thème Fluide** | Supporte les thèmes sombre et clair avec des transitions fluides et mémorise automatiquement vos préférences via `localStorage`. |
| 🎨 **Esthétique Glassmorphism** | Présente un magnifique design en verre dépoli (Glassmorphism) avec des arrière-plans dégradés lumineux et adaptatifs pour une expérience visuelle haut de gamme. |
| 🏅 **Badges de Classement** | Des badges dégradés or, argent et bronze mettent en valeur les 3 meilleurs projets, suivis d'une grille de présentation propre et alignée. |
| 📱 **Design Responsif (RWD)** | Entièrement optimisé pour les mobiles, tablettes et ordinateurs. La navigation par onglets est fluide et glissante sur les écrans tactiles. |
| ⚡ **Chargement Ultra-Rapide** | Propulsé par des fichiers JSON statiques sans aucun appel d'API en temps réel au chargement, garantissant des temps d'affichage de l'ordre de la milliseconde. |
| 🔄 **Mise à Jour Hebdomadaire** | Un workflow planifié GitHub Actions s'exécute chaque samedi à 08h00 UTC+8 pour récupérer les derniers dépôts populaires. |
| 💰 **100% Gratuit** | Fonctionne entièrement sur les offres gratuites de l'API GitHub, de l'API Gemini, de GitHub Actions et de GitHub Pages. |

---

## 📄 Licence

Ce projet est sous licence [MIT License](LICENSE).

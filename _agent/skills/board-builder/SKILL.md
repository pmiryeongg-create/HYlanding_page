---
name: "board-builder"
description: "GitHub API & Vercel 기반 정적 게시판 및 랜딩페이지 자동 생성 스킬"
---

# Board Builder Skill

이 스킬은 부동산 랜딩페이지와 실시간 연동되는 GitHub API 기반 정적 게시판 홈페이지를 구축하는 스킬입니다.

## 주요 기능
- **LocalStorage & GitHub Hybrid DB**: 로컬 저장소와 원격 GitHub 리포지토리를 병렬 연동하여 실시간 데이터 저장 및 정적 페이지 서빙을 처리합니다.
- **Vercel Serverless Function Config**: 보안이 필요한 GitHub Token과 비밀번호를 Vercel 환경변수에서 가져와 프론트엔드로 안전하게 주입합니다.
- **Markdown Parser & Text Summary**: 외부 라이브러리 없이 순수 JavaScript로 구현된 HTML-escape 안전한 마크다운 렌더러와 텍스트 요약 함수를 제공합니다.
- **모바일 최적화 반응형 레이아웃**: 모든 페이지에 Tailwind CSS를 활용한 반응형 웹 디자인을 적용합니다.

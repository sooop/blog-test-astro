// 서식 복원(src/lib/style.ts)의 안전성 검사: 복원 결과는 항상 '에디터 출력과 같은 구조'여야 한다.
//   npm run test:style
import { restoreStyle, structure } from '../src/lib/style.ts';

let failed = 0;
function check(name, original, next, expect) {
  const out = restoreStyle(original, next);
  const sameStructure = structure(out) === structure(next);
  const errs = [];
  if (!sameStructure) errs.push('구조가 에디터 출력과 다름(사용자 편집이 사라졌을 수 있음)');
  if (expect && !expect(out)) errs.push('기대한 형태가 아님');
  console.log(`${errs.length ? 'FAIL' : 'ok  '} ${name}${errs.length ? '\n     ' + errs.join(', ') + '\n     ' + JSON.stringify(out) : ''}`);
  if (errs.length) failed++;
}

// 1) 편집 없음: 서식만 다른 출력은 원문 그대로 복원된다
check('서식만 다름 → 원문 유지', '- a  \n  - b\n\n\n- c\n', '* a\n  * b\n\n* c\n', (o) => o === '- a  \n  - b\n\n\n- c\n');

// 2) 사용자가 중첩을 바꿈: 들여쓰기를 무시한 복원은 구조가 달라지므로 채택되면 안 된다
check('목록 중첩을 해제한 편집이 유지된다', '- a\n  - b\n- c\n', '* a\n* b\n* c\n', (o) => !/^ {2}- b/m.test(o));
check('목록 중첩을 추가한 편집이 유지된다', '- a\n- b\n- c\n', '* a\n  * b\n* c\n', (o) => /^ +[-*] b/m.test(o));

// 3) 줄을 지우거나 바꾼 편집
check('줄 삭제가 유지된다', '문단 하나\n\n문단 둘\n\n문단 셋\n', '문단 하나\n\n문단 셋\n', (o) => !o.includes('둘'));
check('줄 수정이 유지된다', '문단 하나\n\n문단 둘\n', '문단 하나\n\n문단 둘 수정\n', (o) => o.includes('둘 수정'));

// 4) 코드 블록 안은 글자 하나까지 에디터 출력을 따른다
check('코드 안의 줄 수정이 유지된다', '```py\nx = 1\n- y\n```\n', '```py\nx = 1\n- z\n```\n', (o) => o.includes('- z') && !o.includes('- y'));
check('코드 안의 빈 줄 삭제가 유지된다', '```py\na\n\nb\n```\n', '```py\na\nb\n```\n', (o) => !o.includes('a\n\nb'));

// 5) 인용·표
check('인용 표식 서식', '>[!info] 제목\n>내용\n', '> [!info] 제목\n> 내용\n', (o) => o === '>[!info] 제목\n>내용\n');
check('표 정렬 서식', '|a|b|\n|-|-|\n|1|2|\n', '| a | b |\n| - | - |\n| 1 | 2 |\n', (o) => o === '|a|b|\n|-|-|\n|1|2|\n');

// 6) 코드 블록 바로 뒤 문단(원문에 빈 줄이 없던 자리)에 에디터가 빈 줄을 넣어도 편집한 문단 앞에 끼어들지 않는다
check('코드 뒤 문단 편집', '```\ncode\n```\n원래 문단\n', '```\ncode\n```\n\n원래 문단 수정\n', (o) => o === '```\ncode\n```\n원래 문단 수정\n');

// 7) 본문 끝 줄바꿈은 원문을 따른다
check('끝 줄바꿈 유지', '내용\n\n', '내용', (o) => o === '내용\n\n');

console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exit(failed ? 1 : 0);

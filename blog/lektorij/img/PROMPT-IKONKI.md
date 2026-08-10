# Иконки курсов Лектория: как генерировать

Иконка курса — квадрат 200×200, `webp`, лежит в `blog/lektorij/img/<slug>.webp`.
Стиль сложился по сорока с лишним курсам и узнаётся с миниатюры: **один
предмет, чёрный фон, студийный свет**. Ни текста, ни людей, ни коллажей.

Генерировать удобнее **листом** — сеткой предметов на одном холсте за один
проход: свет, зерно и глубина резкости тогда совпадают между иконками, и в
каталоге они стоят рядом как один набор. Порезать лист на квадраты — минута.

---

## Общий промт (лист 3×2, шесть иконок)

> A single photorealistic still-life grid on one canvas, 3 columns × 2 rows,
> six separate square cells with thin invisible margins, each cell a standalone
> product shot. Deep matte black background throughout, seamless, no seams
> between cells. Studio lighting: one soft key light from upper left, subtle
> rim light on the right edge of each object, faint reflection of the object on
> a black glossy surface underneath. Shallow depth of field, crisp focus on the
> object, gentle falloff into black. Muted colour palette with one restrained
> accent per object; no neon, no gradients, no glow effects. Objects centred in
> their cells, occupying about 70% of cell height, shot slightly above eye
> level. Photorealistic, high detail, physical materials — brass, worn leather,
> paper, glass, matte metal, fabric. No text, no letters, no numbers, no logos,
> no watermarks, no people, no hands, no faces. Square 1:1 cells.
>
> Cell 1: **<предмет 1>**
> Cell 2: **<предмет 2>**
> Cell 3: **<предмет 3>**
> Cell 4: **<предмет 4>**
> Cell 5: **<предмет 5>**
> Cell 6: **<предмет 6>**

Что здесь принципиально и не выбрасывается:

- **deep matte black background, seamless** — иначе генератор рисует рамки и
  подписи между ячейками;
- **faint reflection on black glossy surface** — отражение снизу есть почти на
  всех текущих иконках, без него предмет висит в пустоте;
- **no text, no letters, no numbers** — самая частая порча: модель дописывает
  буквы на корешке книги или циферблате;
- **one restrained accent per object** — палитра сайта приглушённая, неоновая
  подсветка выбивается сразу;
- **objects occupying about 70% of cell height** — иначе в миниатюре 200 px
  предмет не читается.

---

## Что просить в качестве предмета

Правило одно: **предмет, а не иллюстрация понятия**. «Одиночество» — не
грустный человек, а телефон экраном вниз. Хорошая иконка опознаётся без
подписи и не требует додумывания.

Работает: инструмент, прибор, старая вещь с историей, природный объект.
Не работает: символы (сердце, мозг, лампочка), абстракции, знаки, стрелки,
схемы — для схем есть лекционные фигуры внутри статьи.

---

## Десять курсов, которым сейчас нужны настоящие иконки

Сейчас у них временные иконки — побайтовые копии соседних курсов. Проверить
список в любой момент: `md5sum *.webp | sort | uniq -d -w32`.

### Лист А

| файл | курс | предмет |
|---|---|---|
| `druzhba.webp` | Дружба во взрослом возрасте | two vintage enamel camping mugs side by side, one slightly tilted toward the other, steam long gone |
| `separaciya.webp` | Сепарация от родителей | a brass door key lying beside an open padlock, both worn from use |
| `rasstavanie.webp` | Расставание | a single wooden chair turned away from an empty second chair, only the near one in focus |
| `gore.webp` | Горе и утрата | a beeswax candle just extinguished, thin thread of smoke rising |
| `svoe-delo.webp` | Своё дело с нуля | an old brass hand-crank drill standing upright on a workbench edge |
| `pochemu-ne-kopitsya.webp` | Почему не получается копить | a cracked ceramic piggy bank, intact but visibly repaired with fine gold seams |

### Лист Б

| файл | курс | предмет |
|---|---|---|
| `nlp.webp` | НЛП | an antique brass optical prism splitting a thin beam of light |
| `novyj-kod-nlp.webp` | Новый код НЛП | three polished wooden juggling balls in mid-air above an open palm-shaped shadow |
| `kamasutra.webp` | Камасутра | an ancient palm-leaf manuscript bound with red cord, edges darkened with age |
| `samogipnoz.webp` | Самогипноз | a brass pendulum hanging perfectly still on a thin chain |

Каждый лист — один запрос. Промт выше плюс шесть (или четыре) строк `Cell N`.

---

## После генерации

```bash
# порезать лист на квадраты и положить с правильными именами
python3 - <<'PY'
from PIL import Image
sheet = Image.open("list-a.png")
W, H = sheet.size
cols, rows = 3, 2
names = ["druzhba", "separaciya", "rasstavanie",
         "gore", "svoe-delo", "pochemu-ne-kopitsya"]
cw, ch = W // cols, H // rows
for i, name in enumerate(names):
    x, y = (i % cols) * cw, (i // cols) * ch
    cell = sheet.crop((x, y, x + cw, y + ch)).resize((200, 200), Image.LANCZOS)
    cell.convert("RGB").save(f"{name}.webp", "WEBP", quality=88)
    print(name, "готово")
PY
```

Дальше — обычная проверка: `python3 tools/check_site.py` из корня. Размер
файла держать около 5 КБ, как у остальных: на 200 px этого достаточно, а
каталог грузится сразу целиком.

---

## Чего в иконках не бывает

Каждый пункт — то, что уже приходилось переделывать.

**Текста.** Ни на корешке, ни на циферблате, ни водяного знака. В миниатюре
буквы всё равно превращаются в грязь, а модель дописывает их охотно.

**Людей и лиц.** Курс про отношения — это две кружки, а не двое обнявшихся.

**Белого фона.** Каталог тёмный; светлый квадрат в нём выглядит дырой.

**Двух предметов, конкурирующих за внимание.** Второй предмет допустим только
как продолжение первого — вторая кружка, второй стул, — а не как отдельный
смысл.

**Неона и свечения.** Палитра сайта приглушённая: латунь, дерево, стекло,
матовый металл.

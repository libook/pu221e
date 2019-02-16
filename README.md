# pu221e
Puzzle. Hide secrets into a picture.

## How it works

Each picture has pixels.
Each pixel has red, green, blue colors.
Each color is a number in computer.

For example, a pixel ![#0c7bde](https://placehold.it/15/0c7bde/000000?text=+) `#f0c7bde`:

| Color | Decimal | Binary |
| ----- | ------- | ------ |
| Red | 12 | 00001100 |
| Green | 123 | 01111011 |
| Blue | 222 | 11011110 |

I can use low digit of a color to storage message.
First, I need to clean low digit.
For example, clean low 4 digits of the binary of the color:

| Color | Binary |
| ----- | ------ |
| Red | 00000000 |
| Green | 01110000 |
| Blue | 11010000 |

Every character of a message is a number in computer.
For example:

| Character | Binary |
| --------- | ------ |
| a | 01100001 |

Pick high 4 digits and write it into low 4 digits of red color.
Pick low 4 digits and write it into low 4 digits of green color.
It will become ![#0671d0](https://placehold.it/15/0671d0/000000?text=+) `#0671d0`；

| Color | Binary | Decimal |
| ----- | ------ | ------- |
| Red | 00000110 | 6 |
| Green | 01110001 | 113 |
| Blue | 11010000 | 208 |

The difference between the two colors is small:
- ![#0c7bde](https://placehold.it/15/0c7bde/000000?text=+) `#f0c7bde`
- ![#0671d0](https://placehold.it/15/0671d0/000000?text=+) `#0671d0`

If there is more then 1 character, I can also use blue color of pixels.

When I want to decode message from the pixel.
I can just pick low 4 digits of each color, and splice them as a string.

## How to use

### Install

```bash
npm install pu221e -g
```

### Encode message into picture

```bash
pu221e e ./pure_img.png ./img_with_message.png 'This is a secret message.'
```

### Decode message from picture

```bash
pu221e d ./img_with_message.png
```

## Knowing issues

### Does not support outputting jpg format

Because of [issue](https://github.com/oliver-moran/jimp/issues/685) of jimp.
It support use jpg format as input, but does not support outputting jpg format.

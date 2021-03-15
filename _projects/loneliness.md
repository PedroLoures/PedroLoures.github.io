---
title:  "Loneliness"
subtitle: "This project I wanted to write about something I had recently gone through with a similar mechanic to a game that I love"
image: "img/loneliness/image5.png"
---

### Overview
This was my college masterpiece and my Program Conclusion Project. Despite that, I regret a lot about how the project was managed around the end of it.

This project started with me and Beda - as usual - and I wanted to write about something I had recently gone through with a similar mechanic to a game that I love called [_The Company of Myself_](https://www.kongregate.com/games/2DArray/the-company-of-myself)

### Awards
The game was well received with warm feelings from people during SBGames 2013, where, even incomplete, and only three basic and barely done tutorial levels, it achieved third place in the category of _Popular Vote_. That was the **ONLY** category an incomplete game could run. It's theme and way of being expressed was explained in a short paper that got _Best Short Paper_ in the _Trilha de Arte e Design_ (Art and Design Track).

[Placements link](http://www.sbgames.org/sbgames2013/festival/post.php?postId=957): Search for Solidão. “Voto popular” means “Popular Vote” in Portuguese.
[Article Link](http://www.sbgames.org/sbgames2013/proceedings/artedesign/02-dt-short.pdf): [Best Short Paper Certificate Link](attachments/CertificadoTrilhaArtDesign_shortpaper_best.pdf)

### Aftermath
Just a bit after we delivered the project to PUC, we were looked into by PlayTV with "Indiana Produções" to make a video and allow them to use it during their documentary about video games history in Brazil. We appeared alongside great titles like GTA, Resident Evil, and others, which was a HUGE honor.

### Regrets
With the passing time in production, people in the college were wanting to participate somehow in the development of it - after all, spotlight were on this, mostly after SBGames accepted us to go, and more after we got the prize. So, everyone was like: "Oh, you should change this. You should change that", even the base mechanic was remade because it "wasn't well done enough". And most of this were comments by teachers, people that would judge our game in the final day, so we believed in their opinions more than our own, something I did not do in the first half of this project, and I did right. I had a lot of complaints in the first semester of that year because I did not have any enemies. In reality, I did, the dark. But no enemies that can actually kill you, or had a health, or anything. And the teacher kept trying forcing me into it, until I agreed to deliver 18 stages instead of 3, if I could not change that design. THIS was a good move from me, not what I am about to tell.

I rewrote the basic mechanic, and I hate that I feel like the end version of the game, it's beautiful but barely playable, compared to the first versions. Had a TON of bugs. I had to scrap some stuff that behaved different in the state machine that controlled the shadows because it wasn't thought before that a ferris wheel would come into the game, with a bad solution - from a teacher that hated that I use 3d planes to make jump-through platforms (basic 3d modeling, planes have one side. You can use an invisible one as a jump-through platform) and decided to do the ferris wheel with a double trigger, to know when you are below or above, and change if the hit box was active for the floor. What happened? If you, or the shadow got into the ferris wheel, and the other tried to get in the same floor as you, they wouldn't be able to.

What was so buggy in the first version of the game on the base mechanic that made me agree to change? If you had a fps drop, not a few frames, but around 10+, you would have a desync between your shadows and the spots they should end up on. I was doing frame data saves, and tried to change it, around the project end, to a state machine saving only what you pressed, and until you hit where and snap the shadow into place before changing to the next command. This poorly constructed state machine had a lot of stuff left out, and each modification I put on it made it worse. 

But hey! Lesson learned. Plan and execute. If too late to make changes, accept them, even try turning bugs into features. But don't do things without proper planning, they can really mess a project up to the point you feel like not working with it anymore, and making it harder for you to conclude it.

I have remade the game design of this game recently and I plan to tackle back on it and do it justice someday.

### Images
![cenario1](img/loneliness/164211_10201114942625701_18003725_n.jpg)
![cenario2](img/loneliness/249054_10201114949505873_504513675_n.jpg)
![cenario3](img/loneliness/923408_10201114950425896_1363787159_n.jpg)
![cenario4](img/loneliness/942578_10201114949625876_807285118_n.jpg)
![cenario5](img/loneliness/946833_10201114944825756_1801013474_n.jpg)
![opening](img/loneliness/image6.png)
![mainmenu](img/loneliness/image1.png)
![alonelevel1](img/loneliness/image2.png)
![lamprope](img/loneliness/image3.png)
![lampgray](img/loneliness/image4.png)
![ferriswheel](img/loneliness/image5.png)
![lotsofshadowscandles](img/loneliness/image7.png)
![collectable](img/loneliness/image8.png)
![blacknwhite](img/loneliness/image9.png)
![memory1](img/loneliness/memoria_1.png)
![memory2](img/loneliness/memoria_2.png)
![memory3](img/loneliness/memoria_3.png)

### Video
<video controls>
  <source src="img/loneliness/solidao.mp4" type="video/mp4">
</video>
---
title:  "Chaveirinho"
subtitle: "This project was made in a few days and my first mobile game, just as a practice and simple gift for Débora Beda"
image: "img/chaveirinho/buhbasaur1.png"
---

### Overview
This project was made in a few days, just as a practice and simple gift for Débora Beda, my friend, to her, at the time, girlfriend. The project is a mini and simple virtual pet for her girlfriends mobile phone. At the time we had zero knowledge on mobile and prior to the Canvas system. This way she would always have a Beda with her. The only thing very unique in this, is the fact that Beda loves chocolate milk, but has to be Nescau brand, if she gets a Toddy when eating - and eating is randomized what is given to her - she will be mad. The buhbasaur is a joke upon how Beda called Bruna as Buh, with a similar sound to Bul from Bulbasaur. The images are from the Bluestacks emulator used to take these screenshots back when it was made. This project was made around the christmas of 2014. Given our lack of knowledge in mobile and the lack of proper tools from Unity, for a few days project it ended up pretty good.

### What we learned
This was our first project together outside college back in the day, and we got to learn and use a lot of what we learned as shown below by a snippet of one of the cases in our Update Switch for the buttons (this is prior to Canvas)
> if (Input.touchCount == 1)
> {
>     if (Input.GetTouch(0).phase == TouchPhase.Began && guiTexture.HitTest(Input.GetTouch(0).position))
>     {
>         switch (name)
>         {
>             case "Food":
>             {
>                 temp = aux[Random.Range(0, 6)];
>                 TamaCenter.instance.Feed(food[temp], temp);
>                 break;
>             }
>     }
> }

Another fun thing was our attempt in making something that resembled actual petting her
> if (Input.touchCount == 1)
> {
>     if (Input.GetTouch(0).phase == TouchPhase.Began)
>     {
>         Ray ray = Camera.main.ScreenPointToRay(Input.GetTouch(0).position);
>         RaycastHit hit;
>         if (collider && collider.Raycast(ray, out hit, 100f))
>         {
>             if (collider.name == "Bedinha")
>             {
>                 start = true;
>             }
>         }
>     }
>     else if (Input.GetTouch(0).phase == TouchPhase.Moved)
>     {
>         if (start)
>         {
>             TamaCenter.instance.animation.Play("Carinho");
>             TamaCenter.instance.Affection(5);
>         }
>     }
> }

### Images
![normal](img/chaveirinho/buhbasaur1.png)
![mad](img/chaveirinho/buhbasaur2.png)
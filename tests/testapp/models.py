"""Minimal models used only in tests."""
from django.db import models


class Author(models.Model):
    name = models.CharField(max_length=200)

    class Meta:
        app_label = "testapp"


class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name="books")
    tags = models.ManyToManyField("Tag", blank=True)

    class Meta:
        app_label = "testapp"


class Tag(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        app_label = "testapp"

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from apps.catalog.models import Category, Product


@pytest.mark.django_db
def test_product_stock_and_discount_properties() -> None:
    category = Category.objects.create(name="Bags", slug="bags")
    product = Product.objects.create(
        category=category,
        name="Weekend bag",
        slug="weekend-bag",
        sku="BAG-001",
        price=Decimal(750000),
        compare_at_price=Decimal(1000000),
        stock_quantity=3,
    )

    assert product.is_in_stock is True
    assert product.discount_percent == 25


@pytest.mark.django_db
def test_product_rejects_compare_at_price_not_greater_than_price() -> None:
    category = Category.objects.create(name="Bags", slug="bags")
    product = Product(
        category=category,
        name="Weekend bag",
        slug="weekend-bag",
        sku="BAG-001",
        price=Decimal(1000000),
        compare_at_price=Decimal(1000000),
    )

    with pytest.raises(ValidationError, match="Compare-at price must be greater"):
        product.full_clean()
